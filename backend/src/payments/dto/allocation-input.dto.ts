import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsMongoId,
  IsNumber,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';
import { IsTwoDecimalAmount } from '../../expenses/dto/is-two-decimal-amount';

export class AllocationInputDto {
  @IsMongoId()
  voucherId!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  @IsTwoDecimalAmount()
  amount!: number;
}

export class AllocationListDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => AllocationInputDto)
  allocations?: AllocationInputDto[];
}
