import { Controller, Get } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { API_CAPABILITIES } from './api-capabilities';
import { readFileSync } from 'fs';
import { join } from 'path';

function readPackageVersion(): string {
  try {
    const raw = readFileSync(join(__dirname, '..', '..', 'package.json'), 'utf8');
    return (JSON.parse(raw) as { version?: string }).version ?? 'unknown';
  } catch {
    return 'unknown';
  }
}

@Controller('health')
export class HealthController {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  @Get()
  check() {
    const mongoConnected = this.connection.readyState === 1;

    return {
      success: true,
      message: 'Backend is running',
      data: {
        mongodb: mongoConnected ? 'connected' : 'disconnected',
        version: readPackageVersion(),
        capabilities: API_CAPABILITIES,
      },
    };
  }
}
