import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { AuthSessionsService } from '../auth-sessions/auth-sessions.service';
import { secureCompareStrings } from '../common/utils/token-hash.util';
import { EmailService } from '../email/email.service';
import { PasswordResetService } from '../password-reset/password-reset.service';
import { UserResponse } from '../users/interfaces/user-response.interface';
import { UsersService } from '../users/users.service';
import {
  isUserActive,
  isUserSuperAdmin,
  readAuthVersion,
  tokenAuthVersion,
} from '../users/utils/user-account.util';
import { ADMIN_DISPLAY_NAME, ADMIN_SUBJECT } from './constants/auth.constants';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { JwtPayload } from './dto/jwt-payload.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { AuthenticatedUser } from './interfaces/authenticated-user.interface';

export interface AuthTokensResponse {
  accessToken: string;
  refreshToken: string;
  user: UserResponse;
}

@Injectable()
export class AuthService {
  private readonly saltRounds = 12;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly authSessionsService: AuthSessionsService,
    private readonly passwordResetService: PasswordResetService,
    private readonly emailService: EmailService,
  ) {}

  async hashPassword(plainPassword: string): Promise<string> {
    return bcrypt.hash(plainPassword, this.saltRounds);
  }

  async comparePassword(
    plainPassword: string,
    passwordHash: string,
  ): Promise<boolean> {
    return bcrypt.compare(plainPassword, passwordHash);
  }

  private getAdminEmail(): string {
    return this.configService.getOrThrow<string>('admin.email').toLowerCase();
  }

  private isAdminEmail(email: string): boolean {
    return email.toLowerCase().trim() === this.getAdminEmail();
  }

  private validateAdminPassword(password: string): boolean {
    const configuredPassword =
      this.configService.getOrThrow<string>('admin.password');
    return secureCompareStrings(password, configuredPassword);
  }

  async login(loginDto: LoginDto): Promise<AuthTokensResponse> {
    const email = loginDto.email.toLowerCase().trim();

    if (this.isAdminEmail(email)) {
      if (!this.validateAdminPassword(loginDto.password)) {
        throw new UnauthorizedException('Invalid email or password');
      }

      const user: UserResponse = {
        id: ADMIN_SUBJECT,
        name: ADMIN_DISPLAY_NAME,
        email,
      };

      const tokens = await this.issueTokenPair(ADMIN_SUBJECT, email);
      return { ...tokens, user };
    }

    const user = await this.usersService.findByEmailWithPassword(email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordMatches = await this.comparePassword(
      loginDto.password,
      user.password,
    );
    if (!passwordMatches || !isUserActive(user)) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const userResponse = this.usersService.toResponse(user);
    const tokens = await this.issueTokenPair(
      userResponse.id,
      userResponse.email,
      readAuthVersion(user),
    );

    return {
      ...tokens,
      user: userResponse,
    };
  }

  async refresh(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const payload = await this.verifyRefreshToken(refreshToken);
    const session = await this.authSessionsService.findValidSession(
      payload.sub,
      refreshToken,
    );

    if (!session) {
      throw new UnauthorizedException('Unauthorized');
    }

    if (payload.sub !== ADMIN_SUBJECT) {
      const user = await this.usersService.findById(payload.sub);
      const emailMatches = user?.email === payload.email.toLowerCase().trim();
      const versionMatches =
        user !== null && tokenAuthVersion(payload) === readAuthVersion(user);

      if (!user || !emailMatches || !isUserActive(user) || !versionMatches) {
        await this.authSessionsService.revokeSession(session._id.toString());
        throw new UnauthorizedException('Unauthorized');
      }

      await this.authSessionsService.revokeSession(session._id.toString());
      return this.issueTokenPair(
        user._id.toString(),
        user.email,
        readAuthVersion(user),
      );
    }

    await this.authSessionsService.revokeSession(session._id.toString());

    return this.issueTokenPair(payload.sub, payload.email);
  }

  async logout(userId: string, refreshToken: string): Promise<void> {
    await this.verifyRefreshToken(refreshToken);
    await this.authSessionsService.revokeByRefreshToken(userId, refreshToken);
  }

  getProfile(user: AuthenticatedUser): UserResponse {
    return {
      id: user.userId,
      name: user.name,
      email: user.email,
    };
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<void> {
    const email = dto.email.toLowerCase().trim();
    const user = await this.usersService.findByEmail(email);

    if (user && !isUserSuperAdmin(user) && !this.isAdminEmail(email)) {
      const rawToken = this.passwordResetService.generateResetToken();
      const resetExpiresIn = this.configService.getOrThrow<string>(
        'passwordReset.expiresIn',
      );

      await this.passwordResetService.createResetToken(
        user._id.toString(),
        rawToken,
        resetExpiresIn,
      );

      const frontendUrl =
        this.configService.getOrThrow<string>('app.frontendUrl');
      const resetUrl = `${frontendUrl.replace(/\/$/, '')}/reset-password?token=${rawToken}`;

      await this.emailService.sendEmail({
        to: user.email,
        subject: 'Reset your password',
        html: `
          <p>Hi ${user.name},</p>
          <p>We received a request to reset your password. Click the link below to choose a new password:</p>
          <p><a href="${resetUrl}">Reset password</a></p>
          <p>This link expires in ${resetExpiresIn}.</p>
          <p>If you did not request a password reset, you can safely ignore this email.</p>
        `,
        text: `Hi ${user.name},\n\nReset your password using this link (expires in ${resetExpiresIn}):\n${resetUrl}\n\nIf you did not request this, ignore this email.`,
      });
    }
  }

  async validateResetToken(token: string): Promise<void> {
    const record = await this.passwordResetService.findValidToken(token);
    if (!record) {
      throw new BadRequestException('Invalid or expired reset token');
    }
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const record = await this.passwordResetService.findValidToken(dto.token);
    if (!record) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const userId = record.userId.toString();
    const user = await this.usersService.findById(userId);
    if (!user || isUserSuperAdmin(user) || this.isAdminEmail(user.email)) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const passwordHash = await this.hashPassword(dto.password);

    await this.usersService.updatePassword(userId, passwordHash);
    await this.usersService.incrementAuthVersion(userId);
    await this.passwordResetService.markTokenAsUsed(record._id.toString());
  }

  private async issueTokenPair(
    userId: string,
    email: string,
    authVersion?: number,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload: JwtPayload = { sub: userId, email };
    if (authVersion !== undefined) {
      payload.authVersion = authVersion;
    }
    const accessToken = await this.signAccessToken(payload);
    const refreshToken = await this.signRefreshToken(payload);
    const expiresAt = this.getRefreshTokenExpiry(refreshToken);

    await this.authSessionsService.createSession(
      userId,
      refreshToken,
      expiresAt,
    );

    return { accessToken, refreshToken };
  }

  async signAccessToken(payload: JwtPayload): Promise<string> {
    const expiresIn = this.configService.getOrThrow<string>('jwt.expiresIn');
    return this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow<string>('jwt.secret'),
      expiresIn: expiresIn as `${number}${'s' | 'm' | 'h' | 'd'}`,
    });
  }

  private async signRefreshToken(payload: JwtPayload): Promise<string> {
    const expiresIn = this.configService.getOrThrow<string>(
      'jwt.refreshExpiresIn',
    );
    return this.jwtService.signAsync(
      { ...payload, jti: randomUUID() },
      {
        secret: this.configService.getOrThrow<string>('jwt.refreshSecret'),
        expiresIn: expiresIn as `${number}${'s' | 'm' | 'h' | 'd'}`,
      },
    );
  }

  private async verifyRefreshToken(refreshToken: string): Promise<JwtPayload> {
    try {
      return await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.configService.getOrThrow<string>('jwt.refreshSecret'),
      });
    } catch {
      throw new UnauthorizedException('Unauthorized');
    }
  }

  private getRefreshTokenExpiry(refreshToken: string): Date {
    const decoded = this.jwtService.decode(refreshToken);
    if (
      !decoded ||
      typeof decoded !== 'object' ||
      !('exp' in decoded) ||
      typeof decoded.exp !== 'number'
    ) {
      throw new UnauthorizedException('Unauthorized');
    }

    return new Date(decoded.exp * 1000);
  }
}
