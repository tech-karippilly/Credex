import { Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const uri = configService.getOrThrow<string>('mongodb.uri');
        const logger = new Logger('DatabaseModule');

        return {
          uri,
          directConnection: true,
          connectionFactory: (connection: Connection) => {
            connection.on('connected', () => {
              logger.log('MongoDB connected successfully');
            });
            connection.on('error', (err: Error) => {
              logger.error(`MongoDB connection error: ${err.message}`);
            });
            connection.on('disconnected', () => {
              logger.warn('MongoDB disconnected');
            });
            return connection;
          },
        };
      },
    }),
  ],
})
export class DatabaseModule {}
