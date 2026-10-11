import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ADMIN_DISPLAY_NAME, ADMIN_SUBJECT } from '../constants/auth.constants';
import { JwtPayload } from '../dto/jwt-payload.dto';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';
import { UsersService } from '../../users/users.service';
import {
  isUserActive,
  readAuthVersion,
  tokenAuthVersion,
} from '../../users/utils/user-account.util';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('jwt.secret'),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const adminEmail = this.configService
      .getOrThrow<string>('admin.email')
      .toLowerCase();

    if (payload.sub === ADMIN_SUBJECT) {
      if (payload.email.toLowerCase() !== adminEmail) {
        throw new UnauthorizedException('Unauthorized');
      }

      return {
        userId: ADMIN_SUBJECT,
        email: payload.email.toLowerCase(),
        name: ADMIN_DISPLAY_NAME,
        isAdmin: true,
      };
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user || user.email !== payload.email.toLowerCase()) {
      throw new UnauthorizedException('Unauthorized');
    }

    if (!isUserActive(user)) {
      throw new UnauthorizedException('Unauthorized');
    }

    if (tokenAuthVersion(payload) !== readAuthVersion(user)) {
      throw new UnauthorizedException('Unauthorized');
    }

    return {
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
      isAdmin: false,
    };
  }
}
