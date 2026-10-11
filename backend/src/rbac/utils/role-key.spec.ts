import { BadRequestException } from '@nestjs/common';
import { roleKeyFromName } from './role-key';

describe('roleKeyFromName', () => {
  it('builds a stable key from the display name', () => {
    expect(roleKeyFromName(' Finance Admin ')).toBe('finance_admin');
  });

  it('rejects a name that cannot become a key', () => {
    expect(() => roleKeyFromName('123')).toThrow(BadRequestException);
  });
});
