export function inrToPaise(amountInr: number): number {
  return Math.round(amountInr * 100);
}

export function paiseToInr(amountPaise: number): number {
  return amountPaise / 100;
}

export function sumPaiseToInr(totalPaise: number): number {
  return paiseToInr(totalPaise);
}
