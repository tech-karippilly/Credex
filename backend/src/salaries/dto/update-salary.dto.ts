import { IsNumber, Max, Min } from 'class-validator';

const MAX_SALARY_AMOUNT = 10_000_000;

export class UpdateSalaryDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(MAX_SALARY_AMOUNT)
  basePay!: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(MAX_SALARY_AMOUNT)
  houseRentAllowance!: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(MAX_SALARY_AMOUNT)
  esi!: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(MAX_SALARY_AMOUNT)
  pf!: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(MAX_SALARY_AMOUNT)
  tax!: number;
}
