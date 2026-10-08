import ms, { StringValue } from 'ms';

export function parseDurationToMs(duration: string): number {
  const value = ms(duration as StringValue);
  if (value === undefined) {
    throw new Error(`Invalid duration format: ${duration}`);
  }
  return value;
}

export function addDurationToNow(duration: string): Date {
  return new Date(Date.now() + parseDurationToMs(duration));
}
