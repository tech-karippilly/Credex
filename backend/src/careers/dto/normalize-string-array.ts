export function normalizeStringArray(value: unknown): string[] | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return [];
  }
  if (Array.isArray(value)) {
    return value
      .map((item) =>
        typeof item === 'string' ? item.trim() : String(item).trim(),
      )
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
