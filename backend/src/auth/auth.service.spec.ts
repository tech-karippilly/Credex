import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthSessionsService } from '../auth-sessions/auth-sessions.service';
import { EmailService } from '../email/email.service';
import { PasswordResetService } from '../password-reset/password-reset.service';
import { UsersService } from '../users/users.service';
import { ADMIN_SUBJECT } from './constants/auth.constants';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let authService: AuthService;
  let usersService: {
    findByEmailWithPassword: jest.Mock;
    findByEmail: jest.Mock;
    findById: jest.Mock;
    updatePassword: jest.Mock;
    toResponse: jest.Mock;
  };
  let authSessionsService: {
    createSession: jest.Mock;
    findValidSession: jest.Mock;
    revokeSession: jest.Mock;
    revokeByRefreshToken: jest.Mock;
    revokeAllForUser: jest.Mock;
  };
  let jwtService: {
    signAsync: jest.Mock;
    verifyAsync: jest.Mock;
    decode: jest.Mock;
  };

  const adminEmail = 'admin@example.com';
  const adminPassword = 'AdminPass123';

  beforeEach(async () => {
    usersService = {
      findByEmailWithPassword: jest.fn(),
      findByEmail: jest.fn(),
      findById: jest.fn(),
      updatePassword: jest.fn(),
      toResponse: jest.fn(),
    };
    authSessionsService = {
      createSession: jest.fn(),
      findValidSession: jest.fn(),
      revokeSession: jest.fn(),
      revokeByRefreshToken: jest.fn(),
      revokeAllForUser: jest.fn(),
    };
    jwtService = {
      signAsync: jest.fn(),
      verifyAsync: jest.fn(),
      decode: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: jwtService,
        },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn((key: string) => {
              const map: Record<string, string> = {
                'admin.email': adminEmail,
                'admin.password': adminPassword,
                'jwt.secret': 'test-jwt-secret-123456',
                'jwt.expiresIn': '15m',
                'jwt.refreshSecret': 'test-refresh-secret-123456',
                'jwt.refreshExpiresIn': '7d',
                'passwordReset.expiresIn': '15m',
                'app.frontendUrl': 'http://localhost:3001',
              };
              return map[key];
            }),
          },
        },
        {
          provide: UsersService,
          useValue: usersService,
        },
        {
          provide: AuthSessionsService,
          useValue: authSessionsService,
        },
        {
          provide: PasswordResetService,
          useValue: {
            generateResetToken: jest.fn(),
            createResetToken: jest.fn(),
            findValidToken: jest.fn(),
            markTokenAsUsed: jest.fn(),
          },
        },
        {
          provide: EmailService,
          useValue: { sendEmail: jest.fn() },
        },
      ],
    }).compile();

    authService = module.get(AuthService);
  });

  it('logs in admin with valid credentials', async () => {
    jwtService.signAsync.mockResolvedValueOnce('access-token');
    jwtService.signAsync.mockResolvedValueOnce('refresh-token');
    jwtService.decode.mockReturnValue({
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    const result = await authService.login({
      email: adminEmail,
      password: adminPassword,
    });

    expect(result.user.id).toBe(ADMIN_SUBJECT);
    expect(result.accessToken).toBe('access-token');
    expect(authSessionsService.createSession).toHaveBeenCalled();
  });

  it('rejects invalid admin password', async () => {
    await expect(
      authService.login({ email: adminEmail, password: 'wrong-password' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects unknown user login', async () => {
    usersService.findByEmailWithPassword.mockResolvedValue(null);

    await expect(
      authService.login({
        email: 'missing@example.com',
        password: 'SecurePassword123',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rotates refresh token when session is valid', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      sub: ADMIN_SUBJECT,
      email: adminEmail,
    });
    authSessionsService.findValidSession.mockResolvedValue({
      _id: 'session-id',
    });
    jwtService.signAsync.mockResolvedValueOnce('new-access');
    jwtService.signAsync.mockResolvedValueOnce('new-refresh');
    jwtService.decode.mockReturnValue({
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    const result = await authService.refresh('old-refresh-token');

    expect(result.accessToken).toBe('new-access');
    expect(result.refreshToken).toBe('new-refresh');
    expect(authSessionsService.revokeSession).toHaveBeenCalledWith(
      'session-id',
    );
  });

  it('rejects refresh when session is missing', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      sub: ADMIN_SUBJECT,
      email: adminEmail,
    });
    authSessionsService.findValidSession.mockResolvedValue(null);

    await expect(authService.refresh('refresh-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
