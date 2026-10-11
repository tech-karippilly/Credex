import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth/auth.service';
import { UsersService } from '../users/users.service';
import { PermissionsService } from './permissions.service';

/**
 * Prepares RBAC data without changing environment-administrator login.
 *
 * The configured administrator still signs in with ADMIN_EMAIL and
 * ADMIN_PASSWORD and still receives JWT subject "admin". That subject is
 * not a MongoDB id. authVersion is not applied to those tokens.
 *
 * The database record created here is a protected shadow identity for a
 * later cutover. Its password is stored only as a bcrypt hash of the
 * current environment password when the record is first created. Later
 * bootstrap runs do not overwrite that hash, the display name, or
 * authVersion. Login does not read this hash in this phase.
 */
@Injectable()
export class RbacBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(RbacBootstrapService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly permissionsService: PermissionsService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.usersService.backfillDefaults();
    await this.permissionsService.seed();
    await this.ensureSuperAdmin();
  }

  async ensureSuperAdmin(): Promise<void> {
    const email = this.configService
      .getOrThrow<string>('admin.email')
      .toLowerCase()
      .trim();

    const existing = await this.usersService.findByEmail(email);
    if (!existing) {
      await this.createSuperAdmin(email);
      return;
    }

    await this.protectExistingSuperAdmin(existing);
  }

  private async createSuperAdmin(email: string): Promise<void> {
    const passwordHash = await this.authService.hashPassword(
      this.configService.getOrThrow<string>('admin.password'),
    );

    try {
      await this.usersService.createProtectedSuperAdmin(email, passwordHash);
      this.logger.log('Protected super administrator record is present');
    } catch (error) {
      if (!this.isDuplicateKeyError(error)) {
        throw error;
      }

      const created = await this.usersService.findByEmail(email);
      if (!created) {
        this.logger.error(
          'Super administrator bootstrap found a conflicting unique key and no matching email',
        );
        return;
      }

      await this.protectExistingSuperAdmin(created);
    }
  }

  private async protectExistingSuperAdmin(user: {
    _id: { toString(): string };
  }): Promise<void> {
    try {
      const updated = await this.usersService.protectSuperAdminFlags(
        user._id.toString(),
      );
      if (updated) {
        this.logger.log('Protected super administrator record is present');
      }
    } catch (error) {
      if (this.isDuplicateKeyError(error)) {
        this.logger.error(
          'Could not mark the configured administrator as super administrator because another protected record exists',
        );
        return;
      }
      throw error;
    }
  }

  private isDuplicateKeyError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: number }).code === 11000
    );
  }
}
