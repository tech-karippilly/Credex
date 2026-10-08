import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const configService = app.get(ConfigService);
  const port = configService.getOrThrow<number>('app.port');
  const nodeEnv = configService.getOrThrow<string>('app.nodeEnv');

  app.setGlobalPrefix('api/v1');
  app.enableCors({
    origin: nodeEnv === 'production' ? false : true,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());

  await app.listen(port);

  const logger = new Logger('Bootstrap');
  logger.log(`Application running on port ${port} (${nodeEnv})`);
  logger.log(`API prefix: /api/v1`);
}

bootstrap().catch((error: Error) => {
  const logger = new Logger('Bootstrap');
  logger.error(`Failed to start application: ${error.message}`, error.stack);
  process.exit(1);
});
