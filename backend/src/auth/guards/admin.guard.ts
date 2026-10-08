import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ADMIN_SUBJECT } from '../constants/auth.constants';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Forbidden');
    }

    const adminEmail = this.configService
      .getOrThrow<string>('admin.email')
      .toLowerCase();

    const isAdmin =
      user.userId === ADMIN_SUBJECT && user.email.toLowerCase() === adminEmail;

    if (!isAdmin) {
      throw new ForbiddenException('Forbidden');
    }

    return true;
  }
}
