import {
  containsRegex,
  normalizeEmail,
  normalizePhone,
  spreadsheetSafe,
} from './lead-normalize.util';
import { followUpDateFilter } from './lead-filter.util';
import { mapHeader, parseEnum, parseModules } from './lead-excel-map.util';
import { LEAD_SOURCES } from '../constants/lead.constants';

describe('lead normalize helpers', () => {
  it('normalizes phone numbers for comparison', () => {
    expect(normalizePhone('+91 98765-43210')).toBe('+919876543210');
    expect(normalizePhone('098765 43210')).toBe('09876543210');
  });

  it('normalizes emails without changing display separately', () => {
    expect(normalizeEmail(' Ada@Example.com ')).toBe('ada@example.com');
  });

  it('escapes regex search text', () => {
    expect(containsRegex('Acme (Pvt)')).toEqual(/Acme \(Pvt\)/i);
  });

  it('prefixes formula-triggering spreadsheet values', () => {
    expect(spreadsheetSafe('=cmd')).toBe("'=cmd");
    expect(spreadsheetSafe('+123')).toBe("'+123");
    expect(spreadsheetSafe('Acme')).toBe('Acme');
  });
});

describe('lead excel mapping', () => {
  it('maps common header aliases', () => {
    expect(mapHeader('Company Name')).toBe('companyName');
    expect(mapHeader('contact-person')).toBe('contactName');
    expect(mapHeader('Assigned User Email')).toBe('assignedUserEmail');
  });

  it('parses enums and modules from free text', () => {
    expect(parseEnum('cold call', LEAD_SOURCES)).toBe('COLD_CALL');
    expect(parseModules('Loans, HRMS; Mobile App')).toEqual([
      'Loans',
      'HRMS',
      'Mobile App',
    ]);
  });
});

describe('follow-up date filter', () => {
  const now = new Date('2026-10-15T12:00:00.000Z');

  it('treats overdue as before the UTC start of today and excludes won/lost', () => {
    const filter = followUpDateFilter('overdue', now);
    expect(filter.stage).toEqual({ $nin: ['WON', 'LOST'] });
    expect((filter.nextFollowUpAt as { $lt: Date }).$lt.toISOString()).toBe(
      '2026-10-15T00:00:00.000Z',
    );
  });
});
