import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  VoucherCounter,
  VoucherCounterDocument,
} from '../schemas/voucher-counter.schema';

@Injectable()
export class VoucherNumberService {
  constructor(
    @InjectModel(VoucherCounter.name)
    private readonly counterModel: Model<VoucherCounterDocument>,
  ) {}

  formatVoucherNumber(year: number, seq: number): string {
    return `VCH-${year}-${String(seq).padStart(6, '0')}`;
  }

  async generateVoucherNumber(referenceDate?: Date): Promise<string> {
    const date = referenceDate ?? new Date();
    const year = date.getUTCFullYear();

    const counter = await this.counterModel
      .findOneAndUpdate(
        { year },
        { $inc: { seq: 1 } },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      )
      .exec();

    return this.formatVoucherNumber(year, counter.seq);
  }
}
