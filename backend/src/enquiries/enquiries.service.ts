import {
  BadGatewayException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface EnquiryRecord {
  id: string;
  name: string;
  company: string | null;
  email: string;
  phone: string;
  service: string;
  message: string;
  created_at: string;
}

@Injectable()
export class EnquiriesService {
  private readonly logger = new Logger(EnquiriesService.name);

  constructor(private readonly configService: ConfigService) {}

  async list(): Promise<EnquiryRecord[]> {
    const rows = await this.request<EnquiryRecord[]>(
      'enquiries?select=id,name,company,email,phone,service,message,created_at&order=created_at.desc',
      { method: 'GET' },
    );
    return Array.isArray(rows) ? rows : [];
  }

  async remove(id: string): Promise<void> {
    await this.request<undefined>(`enquiries?id=eq.${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { Prefer: 'return=minimal' },
    });
    this.logger.log(`Deleted enquiry ${id}`);
  }

  private credentials(): { url: string; key: string } {
    const url = this.configService.get<string>('supabase.url')?.trim().replace(/\/$/, '');
    const key = this.configService.get<string>('supabase.serviceRoleKey')?.trim();
    if (!url || !key) {
      throw new ServiceUnavailableException('Enquiry storage is not configured on the server');
    }
    return { url, key };
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    const { url, key } = this.credentials();
    let response: Response;
    try {
      response = await fetch(`${url}/rest/v1/${path}`, {
        ...init,
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          Accept: 'application/json',
          ...init.headers,
        },
      });
    } catch (error) {
      this.logger.error(
        `Enquiry storage unreachable: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new BadGatewayException('Enquiry storage request failed');
    }

    if (!response.ok) {
      this.logger.error(`Enquiry storage returned HTTP ${response.status}`);
      throw new BadGatewayException('Enquiry storage request failed');
    }

    if (response.status === 204) {
      return undefined as T;
    }

    const text = await response.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }
}
