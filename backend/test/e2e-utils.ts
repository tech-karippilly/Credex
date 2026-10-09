import { INestApplication, ValidationPipe } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
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

export interface E2eProviderOverride {
  provide: unknown;
  useValue: unknown;
}

export interface CreateE2eAppOptions {
  providerOverrides?: E2eProviderOverride[];
}

export async function createE2eApp(
  options?: CreateE2eAppOptions,
): Promise<E2eContext> {
  const mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri();

  const emailService = {
    sendEmail: jest.fn().mockResolvedValue(undefined),
  };

  let moduleBuilder = Test.createTestingModule({
    imports: [AppModule],
  }).overrideProvider(EmailService).useValue(emailService);

  for (const provider of options?.providerOverrides ?? []) {
    moduleBuilder = moduleBuilder
      .overrideProvider(provider.provide)
      .useValue(provider.useValue);
  }

  const moduleFixture: TestingModule = await moduleBuilder.compile();

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
    await mongod.stop();
  };

  return { app, emailService, teardown };
}
