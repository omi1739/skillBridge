import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Query,
  UseGuards,
  Inject,
  HttpCode,
  HttpStatus,
  BadRequestException,
  UnauthorizedException
} from '@nestjs/common';
import { NestAuthService } from './auth.service';
import { JwtAuthGuard, OptionalJwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { AuthPayload } from '../../services/auth.service';
import { RegisterDto, LoginDto, DeclareSkillDto, UpdateProfileDto, GoogleAuthDto } from '../../dto/auth.dto';
import { RateLimitGuard } from '../../common/rate-limit.guard';
import { RateLimit, RateWindow } from '../../common/rate-limit.decorators';
import { demoAccessAllowed } from '../../common/demo-access';

@Controller()
export class AuthController {
  constructor(@Inject(NestAuthService) private readonly authService: NestAuthService) {}

  @Post('auth/register')
  @UseGuards(RateLimitGuard)
  @RateLimit(10)
  @RateWindow(60_000)
  async register(@Body() body: RegisterDto) {
    if (body.password !== body.confirmPassword) {
      throw new BadRequestException('Passwords do not match.');
    }
    return this.authService.register(body.email, body.password, body.fullName, body.targetRoleId, body.currentStatus);
  }

  @Post('auth/login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimitGuard)
  @RateLimit(20)
  @RateWindow(60_000)
  async login(@Body() body: LoginDto) {
    return this.authService.login(body.email, body.password);
  }

  @Post('auth/google')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimitGuard)
  @RateLimit(20)
  @RateWindow(60_000)
  async google(@Body() body: GoogleAuthDto) {
    return this.authService.googleAuth(body.idToken, body.currentStatus);
  }

  @Get('me')
  @UseGuards(OptionalJwtAuthGuard)
  async getMe(@CurrentUser() user: AuthPayload | undefined) {
    // Identity comes exclusively from the JWT. Unauthenticated callers are
    // served the public demo profile ONLY while demo access is enabled; in
    // production an anonymous caller cannot claim the demo identity.
    const userId = user?.userId || (demoAccessAllowed() ? 'demo_user_01' : undefined);
    if (!userId) {
      throw new UnauthorizedException('Authentication required.');
    }
    return this.authService.getCurrentUser(userId);
  }

  @Get('me/account')
  @UseGuards(JwtAuthGuard)
  async getAccount(@CurrentUser() user: AuthPayload) {
    return this.authService.getCurrentUser(user.userId);
  }

  @Patch('me/profile')
  @UseGuards(JwtAuthGuard)
  async updateProfile(@CurrentUser() user: AuthPayload, @Body() body: UpdateProfileDto) {
    return this.authService.updateProfile(user.userId, body);
  }

  @Post('me/skills/declare')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async declareSkill(@CurrentUser() user: AuthPayload, @Body() body: DeclareSkillDto) {
    return this.authService.declareSkill(user.userId, body.skillId, body.proficiencyScore);
  }

  @Get('me/gaps')
  @UseGuards(JwtAuthGuard)
  async getGaps(@CurrentUser() user: AuthPayload, @Query('roleId') roleId?: string) {
    return this.authService.getGaps(user.userId, roleId);
  }

  @Get('me/recommendations')
  @UseGuards(JwtAuthGuard)
  async getRecommendations(@CurrentUser() user: AuthPayload, @Query('roleId') roleId?: string) {
    return this.authService.getRecommendations(user.userId, roleId);
  }

  @Get('me/report')
  @UseGuards(JwtAuthGuard)
  async getCareerReport(@CurrentUser() user: AuthPayload, @Query('roleId') roleId?: string) {
    return this.authService.getCareerReport(user.userId, roleId);
  }
}
