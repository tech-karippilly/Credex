import { ValidateBy, ValidationOptions } from 'class-validator';
import { hasAtMostTwoDecimalPlaces } from '../utils/money.util';

export function IsTwoDecimalAmount(validationOptions?: ValidationOptions) {
  return ValidateBy(
    {
      name: 'isTwoDecimalAmount',
      validator: {
        validate: (value: unknown) => hasAtMostTwoDecimalPlaces(value),
        defaultMessage: () => 'Amount must have at most 2 decimal places',
      },
    },
    validationOptions,
  );
}
