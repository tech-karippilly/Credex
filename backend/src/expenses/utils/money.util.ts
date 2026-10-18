export function inrToPaise(amountInr: number): number {
  return Math.round(amountInr * 100);
}

/** True when a number is within floating-point noise of a whole number of paise. */
export function hasAtMostTwoDecimalPlaces(value: unknown): boolean {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return false;
  }

  const paise = Math.round(value * 100);
  return Math.abs(value * 100 - paise) < 1e-6;
}

export function paiseToInr(amountPaise: number): number {
  return amountPaise / 100;
}

export function sumPaiseToInr(totalPaise: number): number {
  return paiseToInr(totalPaise);
}
