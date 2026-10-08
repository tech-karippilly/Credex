import { INestApplication, ValidationPipe } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Connection } from 'mongoose';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';
import { EmailService } from '../src/email/email.service';

export interface E2eContext {
  app: INestApplication;
  emailService: { sendEmail: jest.Mock };
  teardown: () => Promise<void>;
}

export async function createE2eApp(): Promise<E2eContext> {
  const dbName = `credex_e2e_${Date.now()}`;
  process.env.MONGODB_URI = `mongodb://127.0.0.1:27017/${dbName}`;

  const emailService = {
    sendEmail: jest.fn().mockResolvedValue(undefined),
  };

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(EmailService)
    .useValue(emailService)
    .compile();

  const app = moduleFixture.createNestApplication();
  app.setGlobalPrefix('api/v1');
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
  await app.init();

  const teardown = async (): Promise<void> => {
    const connection = app.get<Connection>(getConnectionToken());
    await connection.dropDatabase();
    await app.close();
  };

  return { app, emailService, teardown };
}
