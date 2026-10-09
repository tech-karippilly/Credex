import {
  Injectable,
  InternalServerErrorException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface WhatsappSendResult {
  messageId: string;
  status: 'ACCEPTED';
}

export interface WhatsappVoucherMessageInput {
  phone: string;
  body: string;
  document?: {
    buffer: Buffer;
    filename: string;
    mimeType: string;
  };
  documentLink?: string;
}

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  constructor(private readonly configService: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(
      this.configService.get<string>('whatsapp.accessToken') &&
        this.configService.get<string>('whatsapp.phoneNumberId'),
    );
  }

  assertConfigured(): void {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException(
        'WhatsApp is not configured. Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID (and optionally WHATSAPP_API_VERSION, WHATSAPP_BUSINESS_ACCOUNT_ID, WHATSAPP_VOUCHER_TEMPLATE_NAME) in the server environment.',
      );
    }
  }

  async sendVoucherMessage(
    input: WhatsappVoucherMessageInput,
  ): Promise<WhatsappSendResult> {
    this.assertConfigured();

    const accessToken = this.configService.getOrThrow<string>(
      'whatsapp.accessToken',
    );
    const phoneNumberId = this.configService.getOrThrow<string>(
      'whatsapp.phoneNumberId',
    );
    const apiVersion =
      this.configService.get<string>('whatsapp.apiVersion') ?? 'v21.0';
    const templateName = this.configService.get<string>(
      'whatsapp.voucherTemplateName',
    );
    const templateLanguage =
      this.configService.get<string>('whatsapp.voucherTemplateLanguage') ??
      'en';

    const baseUrl = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;
    const to = input.phone.replace(/\s+/g, '');

    let messageId: string | undefined;

    if (templateName) {
      messageId = await this.sendTemplateMessage({
        baseUrl,
        accessToken,
        to,
        templateName,
        templateLanguage,
        body: input.body,
      });
    } else {
      messageId = await this.sendTextMessage({
        baseUrl,
        accessToken,
        to,
        body: input.body,
      });
    }

    if (input.document) {
      const mediaId = await this.uploadMedia({
        apiVersion,
        phoneNumberId,
        accessToken,
        buffer: input.document.buffer,
        mimeType: input.document.mimeType,
        filename: input.document.filename,
      });

      const docMessageId = await this.sendDocumentMessage({
        baseUrl,
        accessToken,
        to,
        mediaId,
        filename: input.document.filename,
        caption: 'Voucher document',
      });
      messageId = docMessageId ?? messageId;
    } else if (input.documentLink) {
      const linkBody = `${input.body}\n\nDocument: ${input.documentLink}`;
      if (!templateName) {
        messageId = await this.sendTextMessage({
          baseUrl,
          accessToken,
          to,
          body: linkBody,
        });
      }
    }

    if (!messageId) {
      throw new InternalServerErrorException('WhatsApp did not return a message id');
    }

    return { messageId, status: 'ACCEPTED' };
  }

  private async sendTextMessage(params: {
    baseUrl: string;
    accessToken: string;
    to: string;
    body: string;
  }): Promise<string> {
    const response = await fetch(params.baseUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${params.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: params.to.replace(/^\+/, ''),
        type: 'text',
        text: { preview_url: false, body: params.body },
      }),
    });

    return this.parseMessageResponse(response, 'text');
  }

  private async sendTemplateMessage(params: {
    baseUrl: string;
    accessToken: string;
    to: string;
    templateName: string;
    templateLanguage: string;
    body: string;
  }): Promise<string> {
    const response = await fetch(params.baseUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${params.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: params.to.replace(/^\+/, ''),
        type: 'template',
        template: {
          name: params.templateName,
          language: { code: params.templateLanguage },
          components: [
            {
              type: 'body',
              parameters: [{ type: 'text', text: params.body.slice(0, 1024) }],
            },
          ],
        },
      }),
    });

    return this.parseMessageResponse(response, 'template');
  }

  private async sendDocumentMessage(params: {
    baseUrl: string;
    accessToken: string;
    to: string;
    mediaId: string;
    filename: string;
    caption: string;
  }): Promise<string> {
    const response = await fetch(params.baseUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${params.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: params.to.replace(/^\+/, ''),
        type: 'document',
        document: {
          id: params.mediaId,
          filename: params.filename,
          caption: params.caption,
        },
      }),
    });

    return this.parseMessageResponse(response, 'document');
  }

  private async uploadMedia(params: {
    apiVersion: string;
    phoneNumberId: string;
    accessToken: string;
    buffer: Buffer;
    mimeType: string;
    filename: string;
  }): Promise<string> {
    const form = new FormData();
    form.append(
      'file',
      new Blob([Uint8Array.from(params.buffer)], { type: params.mimeType }),
      params.filename,
    );
    form.append('type', params.mimeType);
    form.append('messaging_product', 'whatsapp');

    const url = `https://graph.facebook.com/${params.apiVersion}/${params.phoneNumberId}/media`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${params.accessToken}`,
      },
      body: form,
    });

    const payload = (await response.json()) as {
      id?: string;
      error?: { message?: string };
    };

    if (!response.ok || !payload.id) {
      const message =
        payload.error?.message ?? 'WhatsApp media upload failed';
      this.logger.warn(`WhatsApp media upload failed: ${message}`);
      throw new InternalServerErrorException(message);
    }

    return payload.id;
  }

  private async parseMessageResponse(
    response: Response,
    kind: string,
  ): Promise<string> {
    const payload = (await response.json()) as {
      messages?: { id: string }[];
      error?: { message?: string; error_user_msg?: string };
    };

    if (!response.ok) {
      const message =
        payload.error?.error_user_msg ??
        payload.error?.message ??
        `WhatsApp ${kind} message failed`;
      this.logger.warn(`WhatsApp API error: ${message}`);
      throw new InternalServerErrorException(message);
    }

    const messageId = payload.messages?.[0]?.id;
    if (!messageId) {
      throw new InternalServerErrorException(
        `WhatsApp ${kind} message did not return an id`,
      );
    }

    return messageId;
  }
}
