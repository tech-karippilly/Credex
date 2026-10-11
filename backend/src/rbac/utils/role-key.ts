import { BadRequestException } from '@nestjs/common';

export function roleKeyFromName(name: string): string {
  const key = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48);

  if (!/^[a-z][a-z0-9_]{1,47}$/.test(key)) {
    throw new BadRequestException(
      'Role name must contain at least two letters or numbers',
    );
  }

  return key;
}
