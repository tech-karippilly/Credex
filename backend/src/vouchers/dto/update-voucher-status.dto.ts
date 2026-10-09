import { IsEnum } from 'class-validator';
import { VOUCHER_STATUSES } from '../constants/voucher.constants';

export class UpdateVoucherStatusDto {
  @IsEnum(VOUCHER_STATUSES)
  status!: string;
}
