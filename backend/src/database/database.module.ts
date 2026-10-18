import { Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import os from 'os';
import { Connection } from 'mongoose';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const uri = configService.getOrThrow<string>('mongodb.uri');
        const logger = new Logger('DatabaseModule');
        const databaseName = mongodbDatabaseName(uri);

        return {
          uri,
          ...(uri.includes('127.0.0.1') || uri.includes('localhost')
            ? { directConnection: true }
            : {}),
          ...(process.env.NODE_ENV === 'test'
            ? { runtimeAdapters: { os } }
            : {}),
          connectionFactory: (connection: Connection) => {
            connection.on('connected', () => {
              logger.log(`MongoDB connected successfully (database ${databaseName})`);
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

/** Database name from the URI path. Credentials and host are not logged. */
export function mongodbDatabaseName(uri: string): string {
  try {
    const withHttpScheme = uri.replace(/^mongodb(\+srv)?:\/\//, 'https://');
    const name = new URL(withHttpScheme).pathname.replace(/^\//, '').split('/')[0];
    return name || '(default)';
  } catch {
    return '(unparsed)';
  }
}
