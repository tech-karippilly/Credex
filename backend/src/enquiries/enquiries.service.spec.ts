import {
  BadGatewayException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnquiriesService } from './enquiries.service';

function serviceWith(values: Record<string, string | undefined>) {
  return new EnquiriesService({
    get: (key: string) => values[key],
  } as ConfigService);
}

describe('EnquiriesService', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('does not list enquiries when the server credential is missing', async () => {
    const service = serviceWith({
      'supabase.url': '',
      'supabase.serviceRoleKey': '',
    });

    await expect(service.list()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('lists enquiries with the server credential and keeps that credential out of errors', async () => {
    const key = 'service-role-test-key';
    const service = serviceWith({
      'supabase.url': 'https://example.supabase.co',
      'supabase.serviceRoleKey': key,
    });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify([
          {
            id: '5b1b1b1b-1b1b-4b1b-8b1b-1b1b1b1b1b1b',
            name: 'A',
            company: null,
            email: 'a@example.com',
            phone: '+919999999999',
            service: 'Other',
            message: 'Hello there',
            created_at: '2026-01-01T00:00:00.000Z',
          },
        ]),
    }) as typeof fetch;

    const rows = await service.list();

    expect(rows).toHaveLength(1);
    expect(rows[0]?.message).toBe('Hello there');
    const call = (global.fetch as jest.Mock).mock.calls[0];
    expect(String(call[0])).toContain('/rest/v1/enquiries?select=');
    expect(call[1].headers.Authorization).toBe(`Bearer ${key}`);
  });

  it('hides storage failures behind a generic error', async () => {
    const service = serviceWith({
      'supabase.url': 'https://example.supabase.co',
      'supabase.serviceRoleKey': 'service-role-test-key',
    });
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => '{"message":"service-role-test-key"}',
    }) as typeof fetch;

    await expect(service.list()).rejects.toBeInstanceOf(BadGatewayException);
    await expect(service.list()).rejects.toThrow('Enquiry storage request failed');
  });

  it('deletes by id without returning the stored message', async () => {
    const service = serviceWith({
      'supabase.url': 'https://example.supabase.co',
      'supabase.serviceRoleKey': 'service-role-test-key',
    });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 204,
      text: async () => '',
    }) as typeof fetch;

    await service.remove('5b1b1b1b-1b1b-4b1b-8b1b-1b1b1b1b1b1b');

    expect(String((global.fetch as jest.Mock).mock.calls[0][0])).toContain(
      'enquiries?id=eq.5b1b1b1b-1b1b-4b1b-8b1b-1b1b1b1b1b1b',
    );
  });
});
