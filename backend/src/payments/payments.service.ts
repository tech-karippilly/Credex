import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import {
  ClientSession,
  Connection,
  isValidObjectId,
  Model,
  Types,
} from 'mongoose';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import {
  formatExpenseDate,
  parseExpenseDate,
} from '../expenses/utils/expense-date.util';
import { inrToPaise, paiseToInr } from '../expenses/utils/money.util';
import { Voucher, VoucherDocument } from '../vouchers/schemas/voucher.schema';
import {
  ALLOCATABLE_VOUCHER_STATUS,
  ALLOCATABLE_VOUCHER_TYPES,
  PAYMENT_DOCUMENT_FOLDER,
} from './constants/payment.constants';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { EligibleVoucherQueryDto } from './dto/eligible-voucher-query.dto';
import { PaymentQueryDto } from './dto/payment-query.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';
import { AllocationInputDto } from './dto/allocation-input.dto';
import {
  EligibleVoucherResponse,
  PaymentListResponse,
  PaymentResponse,
} from './interfaces/payment-response.interface';
import {
  PaymentAllocation,
  PaymentAllocationDocument,
} from './schemas/payment-allocation.schema';
import {
  PaymentAudit,
  PaymentAuditDocument,
} from './schemas/payment-audit.schema';
import {
  PaymentCounter,
  PaymentCounterDocument,
} from './schemas/payment-counter.schema';
import { Payment, PaymentDocument } from './schemas/payment.schema';
import { buildPaymentFieldFilter } from './utils/payment-filter.util';
import {
  allocationDeltas,
  allowedStatusTransitions,
  canTransition,
  countsAsReserved,
  countsAsSettled,
  defaultStatus,
  isFinanciallyLocked,
  isVoidStatus,
  maskAccount,
  normalizeInstrument,
  settlementStatus,
  statusesForMethod,
  validateAllocationTotals,
} from './utils/payment-rules';

type BalanceOp = {
  voucherId: string;
  voucherNumber: string;
  reservedDelta: number;
  settledDelta: number;
};

type StoredAllocation = {
  voucherId: string;
  amountPaise: number;
};

type AuditChange = { field: string; previous: string; next: string };

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private transactionsSupported: boolean | null = null;

  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(Payment.name)
    private readonly paymentModel: Model<PaymentDocument>,
    @InjectModel(PaymentAllocation.name)
    private readonly allocationModel: Model<PaymentAllocationDocument>,
    @InjectModel(PaymentAudit.name)
    private readonly auditModel: Model<PaymentAuditDocument>,
    @InjectModel(PaymentCounter.name)
    private readonly counterModel: Model<PaymentCounterDocument>,
    @InjectModel(Voucher.name)
    private readonly voucherModel: Model<VoucherDocument>,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async create(
    dto: CreatePaymentDto,
    user: AuthenticatedUser,
  ): Promise<PaymentResponse> {
    const id = await this.withConsistency(async (session) => {
      const paymentDate = this.parseDate(dto.paymentDate, 'payment date');
      const status = this.resolveCreateStatus(dto.paymentMethod, dto.status);
      const instrument = this.instrumentFields(dto.paymentMethod, dto);
      const amountPaise = inrToPaise(dto.amount);
      const allocations = await this.resolveAllocations(
        dto.allocations ?? [],
        amountPaise,
        session,
      );
      const applied: BalanceOp[] = [];
      let createdId: Types.ObjectId | null = null;

      try {
        for (const op of this.opsForAmounts(status, allocations)) {
          await this.applyBalanceOp(op, session);
          applied.push(op);
        }

        const paymentNumber = await this.nextPaymentNumber(paymentDate, session);
        const [payment] = await this.paymentModel.create(
          [
            {
              paymentNumber,
              paymentMethod: dto.paymentMethod,
              paymentDate,
              amountPaise,
              payee: dto.payee.trim(),
              ...instrument,
              remarks: dto.remarks?.trim() ?? '',
              status,
              version: 0,
              createdByUserId: user.userId,
              createdByEmail: user.email,
              document: null,
            },
          ],
          this.sessionOptions(session),
        );
        createdId = payment._id;

        if (allocations.length > 0) {
          await this.allocationModel.insertMany(
            allocations.map((row) => ({
              paymentId: payment._id,
              voucherId: new Types.ObjectId(row.voucherId),
              amountPaise: row.amountPaise,
            })),
            this.sessionOptions(session),
          );
        }

        await this.writeAudit(
          {
            paymentId: payment._id,
            action: 'CREATED',
            user,
            summary: 'Payment recorded. Unallocated amount is left unallocated.',
            changes: this.diffSnapshots({}, this.snapshot(payment, allocations)),
          },
          session,
        );

        return payment._id.toString();
      } catch (error) {
        if (createdId) {
          await this.allocationModel
            .deleteMany({ paymentId: createdId }, this.sessionOptions(session))
            .exec();
          await this.paymentModel
            .deleteOne({ _id: createdId }, this.sessionOptions(session))
            .exec();
        }
        await this.safeReverse(applied, session);
        if (this.isDuplicateKeyError(error)) {
          throw this.duplicateException(error);
        }
        throw error;
      }
    });

    return this.findOne(id);
  }

  async findAll(query: PaymentQueryDto): Promise<PaymentListResponse> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const filter = await this.buildFilter(query);
    const skip = (page - 1) * limit;

    const [payments, total] = await Promise.all([
      this.paymentModel
        .find(filter)
        .sort({ paymentDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.paymentModel.countDocuments(filter).exec(),
    ]);

    const allocationGroups = await this.allocationTotals(
      payments.map((payment) => payment._id),
    );

    return {
      items: payments.map((payment) => {
        const group = allocationGroups.get(payment._id.toString()) ?? {
          count: 0,
          amountPaise: 0,
        };
        return {
          id: payment._id.toString(),
          paymentNumber: payment.paymentNumber,
          paymentMethod: payment.paymentMethod,
          paymentDate: formatExpenseDate(payment.paymentDate),
          amount: paiseToInr(payment.amountPaise),
          allocatedAmount: paiseToInr(group.amountPaise),
          unallocatedAmount: paiseToInr(payment.amountPaise - group.amountPaise),
          payee: payment.payee,
          referenceNumber: payment.referenceNumber ?? '',
          chequeNumber: payment.chequeNumber ?? '',
          status: payment.status,
          financiallyLocked: isFinanciallyLocked(payment.status),
          allowedStatuses: allowedStatusTransitions(
            payment.paymentMethod,
            payment.status,
          ),
          linkedVoucherCount: group.count,
          createdAt: payment.createdAt?.toISOString() ?? new Date().toISOString(),
        };
      }),
      pagination: {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<PaymentResponse> {
    const payment = await this.requirePayment(id, null);
    return this.toResponse(payment, true);
  }

  async update(
    id: string,
    dto: UpdatePaymentDto,
    user: AuthenticatedUser,
  ): Promise<PaymentResponse> {
    await this.withConsistency(async (session) => {
      const payment = await this.requirePayment(id, session);
      const current = await this.storedAllocations(payment._id, session);
      const nextAmount =
        dto.amount !== undefined ? inrToPaise(dto.amount) : payment.amountPaise;
      const nextAllocations =
        dto.allocations !== undefined
          ? await this.resolveAllocations(dto.allocations, nextAmount, session)
          : current.map((row) => ({
              voucherId: row.voucherId,
              voucherNumber: row.voucherId,
              amountPaise: row.amountPaise,
            }));

      if (isFinanciallyLocked(payment.status)) {
        this.assertLockedFieldsUnchanged(payment, dto, current, nextAllocations);
        const remarks = dto.remarks !== undefined ? dto.remarks.trim() : payment.remarks;
        if (remarks === (payment.remarks ?? '')) {
          return payment._id.toString();
        }

        const claimed = await this.claimPayment(
          payment,
          { remarks },
          session,
        );
        await this.writeAudit(
          {
            paymentId: payment._id,
            action: 'UPDATED',
            user,
            summary: 'Remarks updated on a posted payment.',
            changes: [
              {
                field: 'remarks',
                previous: payment.remarks ?? '',
                next: remarks,
              },
            ],
          },
          session,
        );
        return claimed._id.toString();
      }

      const instrument = this.instrumentFields(payment.paymentMethod, {
        sourceAccount: dto.sourceAccount ?? payment.sourceAccount,
        referenceNumber: dto.referenceNumber ?? payment.referenceNumber,
        chequeNumber: dto.chequeNumber ?? payment.chequeNumber,
        chequeDate:
          dto.chequeDate ??
          (payment.chequeDate ? formatExpenseDate(payment.chequeDate) : undefined),
        transferMethod: dto.transferMethod ?? payment.transferMethod,
      });
      const paymentDate =
        dto.paymentDate !== undefined
          ? this.parseDate(dto.paymentDate, 'payment date')
          : payment.paymentDate;
      const namedAllocations = await this.withVoucherNumbers(nextAllocations, session);
      const deltas = allocationDeltas(current, namedAllocations);
      const positive = deltas
        .filter((row) => row.deltaPaise > 0)
        .map((row) => this.reserveOp(row.voucherId, namedAllocations, row.deltaPaise));
      const negative = deltas
        .filter((row) => row.deltaPaise < 0)
        .map((row) => this.reserveOp(row.voucherId, [...current, ...namedAllocations], row.deltaPaise));

      const applied: BalanceOp[] = [];
      let claimed: PaymentDocument | null = null;
      let replaced = false;

      try {
        for (const op of positive) {
          await this.applyBalanceOp(op, session);
          applied.push(op);
        }

        claimed = await this.claimPayment(
          payment,
          {
            paymentDate,
            amountPaise: nextAmount,
            payee: dto.payee?.trim() ?? payment.payee,
            remarks: dto.remarks !== undefined ? dto.remarks.trim() : payment.remarks ?? '',
            ...instrument,
          },
          session,
        );

        await this.allocationModel
          .deleteMany({ paymentId: payment._id }, this.sessionOptions(session))
          .exec();
        replaced = true;
        if (namedAllocations.length > 0) {
          await this.allocationModel.insertMany(
            namedAllocations.map((row) => ({
              paymentId: payment._id,
              voucherId: new Types.ObjectId(row.voucherId),
              amountPaise: row.amountPaise,
            })),
            this.sessionOptions(session),
          );
        }

        for (const op of negative) {
          await this.applyBalanceOp(op, session);
          applied.push(op);
        }

        await this.writeAudit(
          {
            paymentId: payment._id,
            action: 'UPDATED',
            user,
            summary: 'Payment updated. The same payment record was kept.',
            changes: this.diffSnapshots(
              this.snapshot(payment, current),
              this.snapshot(claimed, namedAllocations),
            ),
          },
          session,
        );

        return payment._id.toString();
      } catch (error) {
        if (replaced) {
          await this.replaceAllocations(payment._id, current, session);
        }
        if (claimed) {
          await this.paymentModel
            .updateOne(
              { _id: payment._id, version: claimed.version },
              {
                $set: {
                  paymentDate: payment.paymentDate,
                  amountPaise: payment.amountPaise,
                  payee: payment.payee,
                  sourceAccount: payment.sourceAccount,
                  sourceAccountNormalized: payment.sourceAccountNormalized,
                  referenceNumber: payment.referenceNumber,
                  chequeNumber: payment.chequeNumber,
                  chequeNumberNormalized: payment.chequeNumberNormalized,
                  chequeDate: payment.chequeDate ?? null,
                  transferMethod: payment.transferMethod,
                  remarks: payment.remarks,
                },
              },
              this.sessionOptions(session),
            )
            .exec();
        }
        await this.safeReverse(applied, session);
        if (this.isDuplicateKeyError(error)) {
          throw this.duplicateException(error);
        }
        throw error;
      }
    });

    return this.findOne(id);
  }

  async updateStatus(
    id: string,
    dto: UpdatePaymentStatusDto,
    user: AuthenticatedUser,
  ): Promise<PaymentResponse> {
    await this.withConsistency(async (session) => {
      const payment = await this.requirePayment(id, session);
      if (dto.status === payment.status) {
        return payment._id.toString();
      }
      if (!canTransition(payment.paymentMethod, payment.status, dto.status)) {
        throw new BadRequestException(
          `Cannot change status from ${payment.status} to ${dto.status}`,
        );
      }

      const current = await this.storedAllocations(payment._id, session);
      const named = await this.withVoucherNumbers(current, session);
      const ops = this.opsForStatusChange(payment.status, dto.status, named);
      const applied: BalanceOp[] = [];

      try {
        for (const op of ops) {
          await this.applyBalanceOp(op, session);
          applied.push(op);
        }

        const claimed = await this.claimPayment(
          payment,
          { status: dto.status },
          session,
        );
        const note = dto.note?.trim();
        await this.writeAudit(
          {
            paymentId: payment._id,
            action: 'STATUS_CHANGED',
            user,
            summary: note
              ? `Status changed from ${payment.status} to ${dto.status}. ${note}`
              : `Status changed from ${payment.status} to ${dto.status}.`,
            changes: [
              { field: 'status', previous: payment.status, next: dto.status },
            ],
          },
          session,
        );
        return claimed._id.toString();
      } catch (error) {
        await this.safeReverse(applied, session);
        throw error;
      }
    });

    return this.findOne(id);
  }

  async eligibleVouchers(
    query: EligibleVoucherQueryDto,
  ): Promise<EligibleVoucherResponse[]> {
    const limit = query.limit ?? 20;
    const filter: Record<string, unknown> = {
      status: ALLOCATABLE_VOUCHER_STATUS,
      voucherType: { $in: [...ALLOCATABLE_VOUCHER_TYPES] },
    };

    if (query.search?.trim()) {
      const regex = new RegExp(this.escapeRegex(query.search.trim()), 'i');
      filter.$or = [{ voucherNumber: regex }, { title: regex }, { payee: regex }];
    }

    const vouchers = await this.voucherModel
      .find(filter)
      .sort({ voucherDate: -1, createdAt: -1 })
      .limit(200)
      .exec();

    const addBack = new Map<string, number>();
    if (query.excludePaymentId && isValidObjectId(query.excludePaymentId)) {
      const payment = await this.paymentModel.findById(query.excludePaymentId).exec();
      if (payment && countsAsReserved(payment.status)) {
        const rows = await this.allocationModel
          .find({ paymentId: payment._id })
          .exec();
        for (const row of rows) {
          addBack.set(row.voucherId.toString(), row.amountPaise);
        }
      }
    }

    const items: EligibleVoucherResponse[] = [];
    for (const voucher of vouchers) {
      const available =
        voucher.amountPaise -
        (voucher.reservedPaise ?? 0) +
        (addBack.get(voucher._id.toString()) ?? 0);
      if (available <= 0) continue;
      items.push(this.toEligible(voucher, available));
      if (items.length >= limit) break;
    }

    return items;
  }

  async uploadDocument(
    id: string,
    file: Express.Multer.File,
    user: AuthenticatedUser,
  ): Promise<PaymentResponse> {
    const payment = await this.requirePayment(id, null);
    const previous = payment.document ?? null;
    const publicId = `${PAYMENT_DOCUMENT_FOLDER}/${id}`;
    const mimeType = file.mimetype?.toLowerCase() ?? '';
    const isPdf = mimeType === 'application/pdf';

    let uploaded: { url: string; publicId: string };
    try {
      uploaded = isPdf
        ? await this.cloudinaryService.uploadDocument(file, {
            publicId,
            folder: PAYMENT_DOCUMENT_FOLDER,
          })
        : await this.cloudinaryService.uploadImage(file, { publicId });
    } catch (error) {
      this.logger.error(
        `Failed to upload payment document for ${id}: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      throw new InternalServerErrorException('Failed to upload document');
    }

    const document = {
      url: uploaded.url,
      publicId: uploaded.publicId,
      fileName: file.originalname,
      mimeType,
    };

    const updated = await this.paymentModel
      .findByIdAndUpdate(id, { document }, { new: true })
      .exec();
    if (!updated) {
      await this.safeDeleteDocument(document);
      throw new NotFoundException('Payment not found');
    }

    if (previous?.publicId && previous.publicId !== uploaded.publicId) {
      await this.safeDeleteDocument(previous);
    }

    await this.writeAudit(
      {
        paymentId: updated._id,
        action: 'DOCUMENT_ADDED',
        user,
        summary: 'Supporting document stored.',
        changes: [
          {
            field: 'documentFileName',
            previous: previous?.fileName ?? '',
            next: file.originalname,
          },
        ],
      },
      null,
    );

    return this.toResponse(updated, true);
  }

  async removeDocument(
    id: string,
    user: AuthenticatedUser,
  ): Promise<PaymentResponse> {
    const payment = await this.requirePayment(id, null);
    const previousName = payment.document?.fileName ?? '';
    if (payment.document?.publicId) {
      await this.safeDeleteDocument(payment.document);
    }

    payment.document = null;
    await payment.save();
    await this.writeAudit(
      {
        paymentId: payment._id,
        action: 'DOCUMENT_REMOVED',
        user,
        summary: 'Supporting document removed.',
        changes: [
          {
            field: 'documentFileName',
            previous: previousName,
            next: '',
          },
        ],
      },
      null,
    );

    return this.toResponse(payment, true);
  }

  private async toResponse(
    payment: PaymentDocument,
    includeAudit: boolean,
  ): Promise<PaymentResponse> {
    const allocations = await this.allocationModel
      .find({ paymentId: payment._id })
      .exec();
    const vouchers = await this.voucherModel
      .find({ _id: { $in: allocations.map((row) => row.voucherId) } })
      .exec();
    const voucherById = new Map(vouchers.map((voucher) => [voucher._id.toString(), voucher]));
    const allocatedPaise = allocations.reduce((sum, row) => sum + row.amountPaise, 0);
    const audits = includeAudit
      ? await this.auditModel
          .find({ paymentId: payment._id })
          .sort({ createdAt: -1 })
          .limit(50)
          .exec()
      : [];

    return {
      id: payment._id.toString(),
      paymentNumber: payment.paymentNumber,
      paymentMethod: payment.paymentMethod,
      paymentDate: formatExpenseDate(payment.paymentDate),
      amount: paiseToInr(payment.amountPaise),
      allocatedAmount: paiseToInr(allocatedPaise),
      unallocatedAmount: paiseToInr(payment.amountPaise - allocatedPaise),
      payee: payment.payee,
      sourceAccount: payment.sourceAccount ?? '',
      referenceNumber: payment.referenceNumber ?? '',
      chequeNumber: payment.chequeNumber ?? '',
      chequeDate: payment.chequeDate ? formatExpenseDate(payment.chequeDate) : null,
      transferMethod: payment.transferMethod ?? '',
      remarks: payment.remarks ?? '',
      status: payment.status,
      allowedStatuses: allowedStatusTransitions(
        payment.paymentMethod,
        payment.status,
      ),
      financiallyLocked: isFinanciallyLocked(payment.status),
      document: payment.document
        ? {
            url: payment.document.url,
            publicId: payment.document.publicId,
            fileName: payment.document.fileName,
            mimeType: payment.document.mimeType,
          }
        : null,
      allocations: allocations.map((row) => {
        const voucher = voucherById.get(row.voucherId.toString());
        const amountPaise = voucher?.amountPaise ?? 0;
        const settledPaise = voucher?.settledPaise ?? 0;
        const reservedPaise = voucher?.reservedPaise ?? 0;
        return {
          voucherId: row.voucherId.toString(),
          voucherNumber: voucher?.voucherNumber ?? 'Unknown voucher',
          voucherTitle: voucher?.title ?? '',
          voucherDate: voucher?.voucherDate
            ? formatExpenseDate(voucher.voucherDate)
            : '',
          payee: voucher?.payee ?? '',
          voucherAmount: paiseToInr(amountPaise),
          amount: paiseToInr(row.amountPaise),
          amountPaid: paiseToInr(settledPaise),
          outstandingAmount: paiseToInr(Math.max(0, amountPaise - settledPaise)),
          availableToAllocate: paiseToInr(Math.max(0, amountPaise - reservedPaise)),
          settlementStatus: settlementStatus(amountPaise, settledPaise),
        };
      }),
      linkedVoucherCount: allocations.length,
      createdBy: {
        id: payment.createdByUserId,
        email: payment.createdByEmail,
      },
      audit: audits.map((entry) => ({
        action: entry.action,
        actorId: entry.actorId,
        actorEmail: entry.actorEmail,
        summary: entry.summary,
        changes: entry.changes ?? [],
        createdAt: entry.createdAt?.toISOString() ?? new Date().toISOString(),
      })),
      createdAt: payment.createdAt?.toISOString() ?? new Date().toISOString(),
      updatedAt: payment.updatedAt?.toISOString() ?? new Date().toISOString(),
    };
  }

  private toEligible(
    voucher: VoucherDocument,
    availablePaise: number,
  ): EligibleVoucherResponse {
    const settledPaise = voucher.settledPaise ?? 0;
    return {
      id: voucher._id.toString(),
      voucherNumber: voucher.voucherNumber,
      title: voucher.title,
      payee: voucher.payee,
      voucherDate: formatExpenseDate(voucher.voucherDate),
      amount: paiseToInr(voucher.amountPaise),
      amountPaid: paiseToInr(settledPaise),
      outstandingAmount: paiseToInr(Math.max(0, voucher.amountPaise - settledPaise)),
      availableToAllocate: paiseToInr(Math.max(0, availablePaise)),
      settlementStatus: settlementStatus(voucher.amountPaise, settledPaise),
      status: voucher.status,
    };
  }

  private async resolveAllocations(
    rows: AllocationInputDto[],
    paymentPaise: number,
    session: ClientSession | null,
  ): Promise<{ voucherId: string; voucherNumber: string; amountPaise: number }[]> {
    if (new Set(rows.map((row) => row.voucherId)).size !== rows.length) {
      throw new BadRequestException(
        'Each voucher can only be allocated once on a payment',
      );
    }

    const amounts = rows.map((row) => inrToPaise(row.amount));
    const totalError = validateAllocationTotals(paymentPaise, amounts);
    if (totalError) {
      throw new BadRequestException(totalError);
    }

    const resolved = [];
    for (const row of rows) {
      const voucher = await this.requireEligibleVoucher(row.voucherId, session);
      resolved.push({
        voucherId: voucher._id.toString(),
        voucherNumber: voucher.voucherNumber,
        amountPaise: inrToPaise(row.amount),
      });
    }

    return resolved;
  }

  private async requireEligibleVoucher(
    voucherId: string,
    session: ClientSession | null,
  ): Promise<VoucherDocument> {
    if (!isValidObjectId(voucherId)) {
      throw new NotFoundException('Voucher not found');
    }

    const query = this.voucherModel.findById(voucherId);
    if (session) query.session(session);
    const voucher = await query.exec();
    if (!voucher) {
      throw new NotFoundException('Voucher not found');
    }

    if (
      voucher.status !== ALLOCATABLE_VOUCHER_STATUS ||
      !(ALLOCATABLE_VOUCHER_TYPES as readonly string[]).includes(voucher.voucherType)
    ) {
      throw new BadRequestException(
        `Voucher ${voucher.voucherNumber} is not eligible for allocation`,
      );
    }

    return voucher;
  }

  private resolveCreateStatus(method: string, requested?: string): string {
    const status = requested ?? defaultStatus(method);
    if (!statusesForMethod(method).includes(status)) {
      throw new BadRequestException('Status is not valid for this payment method');
    }
    if (isVoidStatus(status)) {
      throw new BadRequestException(
        'Create the payment in an active status. Use a later status change to cancel, bounce, or fail it.',
      );
    }
    return status;
  }

  private instrumentFields(
    method: string,
    dto: {
      sourceAccount?: string;
      referenceNumber?: string;
      chequeNumber?: string;
      chequeDate?: string;
      transferMethod?: string;
    },
  ) {
    const sourceAccount = dto.sourceAccount?.trim() ?? '';
    const referenceNumber = dto.referenceNumber?.trim() ?? '';
    const chequeNumber = method === 'CHEQUE' ? (dto.chequeNumber?.trim() ?? '') : '';
    const transferMethod =
      method === 'BANK_TRANSFER' ? (dto.transferMethod?.trim() ?? '') : '';

    if (method !== 'CHEQUE' && (dto.chequeNumber?.trim() || dto.chequeDate)) {
      throw new BadRequestException('Cheque details are only allowed for cheque payments');
    }
    if (method !== 'BANK_TRANSFER' && dto.transferMethod?.trim()) {
      throw new BadRequestException(
        'Transfer method is only allowed for bank transfers',
      );
    }
    if (method === 'CHEQUE') {
      if (!chequeNumber) {
        throw new BadRequestException('Cheque number is required');
      }
      if (!dto.chequeDate) {
        throw new BadRequestException('Cheque date is required');
      }
      if (!sourceAccount) {
        throw new BadRequestException('Issuing bank or account is required for a cheque');
      }
    }
    if (method === 'BANK_TRANSFER') {
      if (!transferMethod || !['NEFT', 'RTGS', 'IMPS', 'OTHER'].includes(transferMethod)) {
        throw new BadRequestException('Transfer method is required');
      }
      if (!sourceAccount) {
        throw new BadRequestException('Bank or source account is required for a transfer');
      }
    }

    return {
      sourceAccount,
      sourceAccountNormalized:
        method === 'CHEQUE' ? normalizeInstrument(sourceAccount) : '',
      referenceNumber,
      chequeNumber,
      chequeNumberNormalized:
        method === 'CHEQUE' ? normalizeInstrument(chequeNumber) : '',
      chequeDate:
        method === 'CHEQUE' && dto.chequeDate
          ? this.parseDate(dto.chequeDate, 'cheque date')
          : null,
      transferMethod,
    };
  }

  private assertLockedFieldsUnchanged(
    payment: PaymentDocument,
    dto: UpdatePaymentDto,
    current: StoredAllocation[],
    next: { voucherId: string; amountPaise: number }[],
  ): void {
    const changes: string[] = [];
    if (
      dto.paymentDate !== undefined &&
      dto.paymentDate !== formatExpenseDate(payment.paymentDate)
    ) {
      changes.push('payment date');
    }
    if (dto.amount !== undefined && inrToPaise(dto.amount) !== payment.amountPaise) {
      changes.push('amount');
    }
    if (dto.payee !== undefined && dto.payee.trim() !== payment.payee) {
      changes.push('payee');
    }
    if (
      dto.sourceAccount !== undefined &&
      dto.sourceAccount.trim() !== (payment.sourceAccount ?? '')
    ) {
      changes.push('account');
    }
    if (
      dto.referenceNumber !== undefined &&
      dto.referenceNumber.trim() !== (payment.referenceNumber ?? '')
    ) {
      changes.push('reference');
    }
    if (
      dto.chequeNumber !== undefined &&
      dto.chequeNumber.trim() !== (payment.chequeNumber ?? '')
    ) {
      changes.push('cheque number');
    }
    if (
      dto.chequeDate !== undefined &&
      dto.chequeDate !==
        (payment.chequeDate ? formatExpenseDate(payment.chequeDate) : undefined)
    ) {
      changes.push('cheque date');
    }
    if (
      dto.transferMethod !== undefined &&
      dto.transferMethod !== (payment.transferMethod ?? '')
    ) {
      changes.push('transfer method');
    }
    if (dto.allocations !== undefined && !this.sameAllocations(current, next)) {
      changes.push('allocations');
    }

    if (changes.length > 0) {
      throw new BadRequestException(
        `Cleared or posted payments cannot change ${changes.join(', ')}. Change the status through the correction workflow or record a replacement payment.`,
      );
    }
  }

  private sameAllocations(
    current: StoredAllocation[],
    next: { voucherId: string; amountPaise: number }[],
  ): boolean {
    if (current.length !== next.length) return false;
    const sortedCurrent = [...current].sort((a, b) =>
      a.voucherId.localeCompare(b.voucherId),
    );
    const sortedNext = [...next].sort((a, b) => a.voucherId.localeCompare(b.voucherId));
    return sortedCurrent.every(
      (row, index) =>
        row.voucherId === sortedNext[index].voucherId &&
        row.amountPaise === sortedNext[index].amountPaise,
    );
  }

  private opsForAmounts(
    status: string,
    allocations: { voucherId: string; voucherNumber: string; amountPaise: number }[],
  ): BalanceOp[] {
    return allocations.map((row) => ({
      voucherId: row.voucherId,
      voucherNumber: row.voucherNumber,
      reservedDelta: countsAsReserved(status) ? row.amountPaise : 0,
      settledDelta: countsAsSettled(status) ? row.amountPaise : 0,
    }));
  }

  private opsForStatusChange(
    from: string,
    to: string,
    allocations: { voucherId: string; voucherNumber: string; amountPaise: number }[],
  ): BalanceOp[] {
    const reservedDelta = (amount: number) =>
      (countsAsReserved(to) ? amount : 0) - (countsAsReserved(from) ? amount : 0);
    const settledDelta = (amount: number) =>
      (countsAsSettled(to) ? amount : 0) - (countsAsSettled(from) ? amount : 0);

    return allocations
      .map((row) => ({
        voucherId: row.voucherId,
        voucherNumber: row.voucherNumber,
        reservedDelta: reservedDelta(row.amountPaise),
        settledDelta: settledDelta(row.amountPaise),
      }))
      .filter((row) => row.reservedDelta !== 0 || row.settledDelta !== 0);
  }

  private reserveOp(
    voucherId: string,
    known: { voucherId: string; voucherNumber?: string }[],
    deltaPaise: number,
  ): BalanceOp {
    const match = known.find((row) => row.voucherId === voucherId);
    return {
      voucherId,
      voucherNumber: match?.voucherNumber || voucherId,
      reservedDelta: deltaPaise,
      settledDelta: 0,
    };
  }

  private async applyBalanceOp(
    op: BalanceOp,
    session: ClientSession | null,
  ): Promise<void> {
    if (op.reservedDelta !== 0) {
      await this.incrementCounter(
        op.voucherId,
        op.voucherNumber,
        'reservedPaise',
        op.reservedDelta,
        session,
      );
    }
    if (op.settledDelta !== 0) {
      await this.incrementCounter(
        op.voucherId,
        op.voucherNumber,
        'settledPaise',
        op.settledDelta,
        session,
      );
    }
  }

  private async incrementCounter(
    voucherId: string,
    voucherNumber: string,
    field: 'reservedPaise' | 'settledPaise',
    delta: number,
    session: ClientSession | null,
  ): Promise<void> {
    const filter: Record<string, unknown> = {
      _id: new Types.ObjectId(voucherId),
    };

    if (delta > 0) {
      if (field === 'reservedPaise') {
        filter.status = ALLOCATABLE_VOUCHER_STATUS;
        filter.voucherType = { $in: [...ALLOCATABLE_VOUCHER_TYPES] };
      }
      filter.$expr = {
        $lte: [{ $add: [{ $ifNull: [`$${field}`, 0] }, delta] }, '$amountPaise'],
      };
    } else {
      filter.$expr = {
        $gte: [{ $ifNull: [`$${field}`, 0] }, -delta],
      };
    }

    const updated = await this.voucherModel
      .findOneAndUpdate(
        filter,
        { $inc: { [field]: delta } },
        { new: true, ...this.sessionOptions(session) },
      )
      .exec();

    if (!updated) {
      if (delta > 0 && field === 'reservedPaise') {
        throw new BadRequestException(
          `Allocation for voucher ${voucherNumber} exceeds the available balance`,
        );
      }
      throw new ConflictException(
        `Could not reconcile the balance for voucher ${voucherNumber}`,
      );
    }
  }

  private async safeReverse(
    applied: BalanceOp[],
    session: ClientSession | null,
  ): Promise<void> {
    for (const op of [...applied].reverse()) {
      try {
        await this.applyBalanceOp(
          {
            ...op,
            reservedDelta: -op.reservedDelta,
            settledDelta: -op.settledDelta,
          },
          session,
        );
      } catch (error) {
        this.logger.error(
          `Failed to reverse voucher balance for ${op.voucherId}: ${error instanceof Error ? error.message : 'unknown error'}`,
        );
      }
    }
  }

  private async claimPayment(
    payment: PaymentDocument,
    fields: Record<string, unknown>,
    session: ClientSession | null,
  ): Promise<PaymentDocument> {
    const claimed = await this.paymentModel
      .findOneAndUpdate(
        { _id: payment._id, version: payment.version },
        { $set: fields, $inc: { version: 1 } },
        { new: true, ...this.sessionOptions(session) },
      )
      .exec();

    if (!claimed) {
      throw new ConflictException(
        'This payment was changed by someone else. Reload and try again.',
      );
    }

    return claimed;
  }

  private async replaceAllocations(
    paymentId: Types.ObjectId,
    rows: { voucherId: string; amountPaise: number }[],
    session: ClientSession | null,
  ): Promise<void> {
    await this.allocationModel
      .deleteMany({ paymentId }, this.sessionOptions(session))
      .exec();
    if (rows.length === 0) return;
    await this.allocationModel.insertMany(
      rows.map((row) => ({
        paymentId,
        voucherId: new Types.ObjectId(row.voucherId),
        amountPaise: row.amountPaise,
      })),
      this.sessionOptions(session),
    );
  }

  private async storedAllocations(
    paymentId: Types.ObjectId,
    session: ClientSession | null,
  ): Promise<StoredAllocation[]> {
    const query = this.allocationModel.find({ paymentId });
    if (session) query.session(session);
    const rows = await query.exec();
    return rows.map((row) => ({
      voucherId: row.voucherId.toString(),
      amountPaise: row.amountPaise,
    }));
  }

  private async withVoucherNumbers(
    rows: { voucherId: string; voucherNumber?: string; amountPaise: number }[],
    session: ClientSession | null,
  ): Promise<{ voucherId: string; voucherNumber: string; amountPaise: number }[]> {
    const missing = rows.filter((row) => !row.voucherNumber || row.voucherNumber === row.voucherId);
    const query = this.voucherModel.find({
      _id: { $in: missing.map((row) => new Types.ObjectId(row.voucherId)) },
    });
    if (session) query.session(session);
    const vouchers = missing.length > 0 ? await query.exec() : [];
    const names = new Map(vouchers.map((voucher) => [voucher._id.toString(), voucher.voucherNumber]));

    return rows.map((row) => ({
      voucherId: row.voucherId,
      voucherNumber:
        row.voucherNumber && row.voucherNumber !== row.voucherId
          ? row.voucherNumber
          : names.get(row.voucherId) ?? row.voucherId,
      amountPaise: row.amountPaise,
    }));
  }

  private async nextPaymentNumber(
    referenceDate: Date,
    session: ClientSession | null,
  ): Promise<string> {
    const year = referenceDate.getUTCFullYear();
    const counter = await this.counterModel
      .findOneAndUpdate(
        { year },
        { $inc: { seq: 1 } },
        {
          new: true,
          upsert: true,
          setDefaultsOnInsert: true,
          ...this.sessionOptions(session),
        },
      )
      .exec();

    return `PAY-${year}-${String(counter?.seq ?? 1).padStart(6, '0')}`;
  }

  private async writeAudit(
    entry: {
      paymentId: Types.ObjectId;
      action: string;
      user: AuthenticatedUser;
      summary: string;
      changes: AuditChange[];
    },
    session: ClientSession | null,
  ): Promise<void> {
    await this.auditModel.create(
      [
        {
          paymentId: entry.paymentId,
          action: entry.action,
          actorId: entry.user.userId,
          actorEmail: entry.user.email,
          summary: entry.summary,
          changes: entry.changes.map((change) =>
            change.field === 'sourceAccount'
              ? {
                  ...change,
                  previous: maskAccount(change.previous),
                  next: maskAccount(change.next),
                }
              : change,
          ),
        },
      ],
      this.sessionOptions(session),
    );
  }

  private snapshot(
    payment: {
      paymentDate: Date;
      amountPaise: number;
      payee: string;
      sourceAccount?: string;
      referenceNumber?: string;
      chequeNumber?: string;
      chequeDate?: Date | null;
      transferMethod?: string;
      remarks?: string;
      status: string;
    },
    allocations: { voucherId: string; amountPaise: number }[],
  ): Record<string, string> {
    return {
      paymentDate: formatExpenseDate(payment.paymentDate),
      amount: paiseToInr(payment.amountPaise).toFixed(2),
      payee: payment.payee,
      sourceAccount: payment.sourceAccount ?? '',
      referenceNumber: payment.referenceNumber ?? '',
      chequeNumber: payment.chequeNumber ?? '',
      chequeDate: payment.chequeDate ? formatExpenseDate(payment.chequeDate) : '',
      transferMethod: payment.transferMethod ?? '',
      remarks: payment.remarks ?? '',
      status: payment.status,
      allocations: [...allocations]
        .map((row) => `${row.voucherId}:${row.amountPaise}`)
        .sort()
        .join(','),
    };
  }

  private diffSnapshots(
    previous: Record<string, string>,
    next: Record<string, string>,
  ): AuditChange[] {
    const fields = new Set([...Object.keys(previous), ...Object.keys(next)]);
    return [...fields]
      .filter((field) => (previous[field] ?? '') !== (next[field] ?? ''))
      .map((field) => ({
        field,
        previous: previous[field] ?? '',
        next: next[field] ?? '',
      }));
  }

  private async requirePayment(
    id: string,
    session: ClientSession | null,
  ): Promise<PaymentDocument> {
    if (!isValidObjectId(id)) {
      throw new NotFoundException('Payment not found');
    }
    const query = this.paymentModel.findById(id);
    if (session) query.session(session);
    const payment = await query.exec();
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }
    return payment;
  }

  private async buildFilter(query: PaymentQueryDto): Promise<Record<string, unknown>> {
    const filter = buildPaymentFieldFilter(query);

    if (query.voucherId) {
      if (!isValidObjectId(query.voucherId)) {
        throw new BadRequestException('Invalid voucher id');
      }
      const ids = await this.allocationModel.distinct('paymentId', {
        voucherId: new Types.ObjectId(query.voucherId),
      });
      filter._id = { $in: ids };
    }

    return filter;
  }

  private async allocationTotals(ids: Types.ObjectId[]) {
    const rows = await this.allocationModel
      .find({ paymentId: { $in: ids } })
      .select('paymentId amountPaise')
      .exec();
    const groups = new Map<string, { count: number; amountPaise: number }>();
    for (const row of rows) {
      const key = row.paymentId.toString();
      const current = groups.get(key) ?? { count: 0, amountPaise: 0 };
      current.count += 1;
      current.amountPaise += row.amountPaise;
      groups.set(key, current);
    }
    return groups;
  }

  private parseDate(value: string, label: string): Date {
    try {
      return parseExpenseDate(value);
    } catch {
      throw new BadRequestException(`Invalid ${label}`);
    }
  }

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private sessionOptions(session: ClientSession | null): { session?: ClientSession } {
    return session ? { session } : {};
  }

  private async withConsistency<T>(
    work: (session: ClientSession | null) => Promise<T>,
  ): Promise<T> {
    if (this.transactionsSupported === false) {
      return work(null);
    }

    const session = await this.connection.startSession();
    try {
      let result!: T;
      await session.withTransaction(async () => {
        result = await work(session);
      });
      this.transactionsSupported = true;
      return result;
    } catch (error) {
      if (this.isTransactionsUnsupported(error)) {
        this.transactionsSupported = false;
        return work(null);
      }
      throw error;
    } finally {
      await session.endSession();
    }
  }

  private isTransactionsUnsupported(error: unknown): boolean {
    const messages: string[] = [];
    let current: unknown = error;
    for (let depth = 0; depth < 5 && current && typeof current === 'object'; depth += 1) {
      if ('message' in current) {
        messages.push(String((current as { message: unknown }).message));
      }
      current = 'cause' in current ? (current as { cause?: unknown }).cause : undefined;
    }
    return messages.some((message) =>
      /transaction numbers are only allowed|replica set member|transactions are not supported/i.test(
        message,
      ),
    ) || this.hasTransactionErrorCode(error);
  }

  private hasTransactionErrorCode(error: unknown): boolean {
    let current: unknown = error;
    for (let depth = 0; depth < 5 && current && typeof current === 'object'; depth += 1) {
      if ('code' in current && (current as { code?: number }).code === 20) {
        return true;
      }
      current = 'cause' in current ? (current as { cause?: unknown }).cause : undefined;
    }
    return false;
  }

  private isDuplicateKeyError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: number }).code === 11000
    );
  }

  private duplicateException(error: unknown): ConflictException {
    const text = JSON.stringify(error).toLowerCase();
    if (text.includes('cheque')) {
      return new ConflictException(
        'A cheque with this number already exists for the same bank account',
      );
    }
    return new ConflictException('Duplicate payment number');
  }

  private async safeDeleteDocument(document: {
    publicId: string;
    mimeType: string;
  }): Promise<void> {
    try {
      const resourceType = document.mimeType === 'application/pdf' ? 'raw' : 'image';
      await this.cloudinaryService.deleteAsset(document.publicId, resourceType);
    } catch (error) {
      this.logger.warn(
        `Failed to delete payment document ${document.publicId}: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }
  }
}
