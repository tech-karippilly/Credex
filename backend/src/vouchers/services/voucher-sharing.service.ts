import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EmailService } from '../../email/email.service';
import { WhatsappService } from '../../whatsapp/whatsapp.service';
import { SendVoucherEmailDto } from '../dto/send-voucher-email.dto';
import { SendVoucherWhatsappDto } from '../dto/send-voucher-whatsapp.dto';
import {
  VoucherDeliveryAttemptResponse,
  VoucherShareResponse,
} from '../interfaces/voucher-delivery.interface';
import { Voucher, VoucherDocument } from '../schemas/voucher.schema';
import {
  buildVoucherEmailHtml,
  buildVoucherEmailText,
  buildVoucherWhatsappBody,
} from '../voucher-email.template';
import { VouchersService } from '../vouchers.service';
import { VoucherPdfService } from './voucher-pdf.service';

@Injectable()
export class VoucherSharingService {
  private readonly logger = new Logger(VoucherSharingService.name);

  constructor(
    @InjectModel(Voucher.name)
    private readonly voucherModel: Model<VoucherDocument>,
    private readonly vouchersService: VouchersService,
    private readonly emailService: EmailService,
    private readonly whatsappService: WhatsappService,
    private readonly voucherPdfService: VoucherPdfService,
  ) {}

  async sendEmail(
    id: string,
    dto: SendVoucherEmailDto,
  ): Promise<VoucherShareResponse> {
    const voucher = await this.vouchersService.findOne(id);
    const attemptedAt = new Date();

    try {
      const attachment = await this.resolvePdfAttachment(voucher);
      const sendResult = await this.emailService.sendEmail({
        to: dto.email,
        subject: `Voucher ${voucher.voucherNumber} from Credex`,
        html: buildVoucherEmailHtml(voucher, dto.message),
        text: buildVoucherEmailText(voucher, dto.message),
        attachments: attachment
          ? [
              {
                filename: attachment.filename,
                content: attachment.buffer,
              },
            ]
          : undefined,
      });

      const deliveryAttempt = await this.recordAttempt(id, {
        channel: 'EMAIL',
        recipient: dto.email,
        status: 'ACCEPTED',
        providerMessageId: sendResult.id,
        attemptedAt,
      });

      return {
        voucher: await this.vouchersService.findOne(id),
        deliveryAttempt,
      };
    } catch (error) {
      const summary = this.errorSummary(error);
      this.logger.warn(`Voucher email failed for ${id}: ${summary}`);
      await this.recordAttempt(id, {
        channel: 'EMAIL',
        recipient: dto.email,
        status: 'FAILED',
        errorSummary: summary,
        attemptedAt,
      });
      throw new InternalServerErrorException(
        'Failed to send voucher email. Please try again later.',
      );
    }
  }

  async sendWhatsapp(
    id: string,
    dto: SendVoucherWhatsappDto,
  ): Promise<VoucherShareResponse> {
    this.whatsappService.assertConfigured();

    const voucher = await this.vouchersService.findOne(id);
    const attemptedAt = new Date();
    const body = buildVoucherWhatsappBody(voucher, dto.message);

    try {
      const attachment = await this.resolvePdfAttachment(voucher);
      const sendResult = await this.whatsappService.sendVoucherMessage({
        phone: dto.phone,
        body,
        document: attachment
          ? {
              buffer: attachment.buffer,
              filename: attachment.filename,
              mimeType: 'application/pdf',
            }
          : undefined,
        documentLink:
          !attachment && voucher.document?.url
            ? voucher.document.url
            : undefined,
      });

      const deliveryAttempt = await this.recordAttempt(id, {
        channel: 'WHATSAPP',
        recipient: dto.phone,
        status: 'ACCEPTED',
        providerMessageId: sendResult.messageId,
        attemptedAt,
      });

      return {
        voucher: await this.vouchersService.findOne(id),
        deliveryAttempt,
      };
    } catch (error) {
      const summary = this.errorSummary(error);
      this.logger.warn(`Voucher WhatsApp failed for ${id}: ${summary}`);
      await this.recordAttempt(id, {
        channel: 'WHATSAPP',
        recipient: dto.phone,
        status: 'FAILED',
        errorSummary: summary,
        attemptedAt,
      });
      throw error;
    }
  }

  private async resolvePdfAttachment(
    voucher: Awaited<ReturnType<VouchersService['findOne']>>,
  ): Promise<{ buffer: Buffer; filename: string } | null> {
    const uploaded = voucher.document;
    if (uploaded?.mimeType === 'application/pdf') {
      try {
        const response = await fetch(uploaded.url);
        if (!response.ok) {
          throw new Error('Could not fetch uploaded voucher PDF');
        }
        const arrayBuffer = await response.arrayBuffer();
        return {
          buffer: Buffer.from(arrayBuffer),
          filename: uploaded.fileName || `${voucher.voucherNumber}.pdf`,
        };
      } catch (error) {
        this.logger.warn(
          `Using generated PDF for ${voucher.voucherNumber}: ${this.errorSummary(error)}`,
        );
      }
    }

    try {
      const buffer = await this.voucherPdfService.generate(voucher);
      return {
        buffer,
        filename: `${voucher.voucherNumber}.pdf`,
      };
    } catch (error) {
      this.logger.warn(
        `Could not generate PDF for ${voucher.voucherNumber}: ${this.errorSummary(error)}`,
      );
      return null;
    }
  }

  private async recordAttempt(
    voucherId: string,
    attempt: {
      channel: string;
      recipient: string;
      status: string;
      providerMessageId?: string;
      errorSummary?: string;
      attemptedAt: Date;
    },
  ): Promise<VoucherDeliveryAttemptResponse> {
    const entry = {
      channel: attempt.channel,
      recipient: attempt.recipient,
      status: attempt.status,
      providerMessageId: attempt.providerMessageId,
      errorSummary: attempt.errorSummary,
      attemptedAt: attempt.attemptedAt,
    };

    await this.voucherModel.findByIdAndUpdate(voucherId, {
      $push: { deliveryAttempts: entry },
    });

    return {
      channel: entry.channel,
      recipient: entry.recipient,
      status: entry.status,
      providerMessageId: entry.providerMessageId,
      errorSummary: entry.errorSummary,
      attemptedAt: entry.attemptedAt.toISOString(),
    };
  }

  private errorSummary(error: unknown): string {
    if (error instanceof Error) {
      return error.message.slice(0, 500);
    }
    return 'Unknown error';
  }
}
