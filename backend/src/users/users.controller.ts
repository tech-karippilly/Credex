import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { AdminGuard } from '../auth/guards/admin.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, AdminGuard)
  async create(@Body() createUserDto: CreateUserDto) {
    const passwordHash = await this.authService.hashPassword(
      createUserDto.password,
    );
    const user = await this.usersService.create(createUserDto, passwordHash);

    return {
      success: true,
      message: 'User created successfully',
      data: user,
    };
  }
}
