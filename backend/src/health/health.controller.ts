import { Controller, Get } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

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
      },
    };
  }
}
