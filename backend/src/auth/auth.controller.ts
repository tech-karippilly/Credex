import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type { AuthenticatedUser } from './interfaces/authenticated-user.interface';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    const result = await this.authService.login(loginDto);
    return {
      success: true,
      message: 'Login successful',
      data: result,
    };
  }

  @Post('refresh')
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    const tokens = await this.authService.refresh(refreshTokenDto.refreshToken);
    return {
      success: true,
      message: 'Token refreshed successfully',
      data: tokens,
    };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(
    @CurrentUser() user: AuthenticatedUser,
    @Body() logoutDto: LogoutDto,
  ) {
    await this.authService.logout(user.userId, logoutDto.refreshToken);
    return {
      success: true,
      message: 'Logout successful',
    };
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  getProfile(@CurrentUser() user: AuthenticatedUser) {
    return {
      success: true,
      message: 'Profile fetched successfully',
      data: this.authService.getProfile(user),
    };
  }

  @Post('forgot-password')
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    await this.authService.forgotPassword(forgotPasswordDto);
    return {
      success: true,
      message: 'If the email exists, a password reset link has been sent.',
    };
  }

  @Get('reset-password/validate')
  async validateResetToken(@Query('token') token?: string) {
    if (!token) {
      return {
        success: false,
        message: 'Invalid or expired reset token',
      };
    }

    try {
      await this.authService.validateResetToken(token);
      return {
        success: true,
        message: 'Reset token is valid',
      };
    } catch {
      return {
        success: false,
        message: 'Invalid or expired reset token',
      };
    }
  }

  @Post('reset-password')
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    await this.authService.resetPassword(resetPasswordDto);
    return {
      success: true,
      message: 'Password reset successfully',
    };
  }
}
