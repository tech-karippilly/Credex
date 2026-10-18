export function normalizeStringArray(value: unknown): string[] | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return [];
  }
  if (Array.isArray(value)) {
    if (value.some((item) => typeof item !== 'string')) {
      return value as string[];
    }
    return value
      .map((item) => item.trim())
      .filter((line) => line.length > 0);
  }
  if (typeof value === 'string') {
    return value
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  }
  return undefined;
}
