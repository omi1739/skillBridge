import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Query,
  UseGuards,
  BadRequestException,
  Inject,
  HttpCode,
  HttpStatus
} from '@nestjs/common';
import { NestAuthService } from './auth.service';
import { JwtAuthGuard, OptionalJwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { AuthPayload } from '../../services/auth.service';

@Controller()
export class AuthController {
  constructor(@Inject(NestAuthService) private readonly authService: NestAuthService) {}

  @Post('auth/register')
  async register(@Body() body: { email?: string; password?: string; fullName?: string; targetRoleId?: string }) {
    if (!body.email || !body.password || !body.fullName) {
      throw new BadRequestException('Email, password, and fullName are required.');
    }
    return this.authService.register(body.email, body.password, body.fullName, body.targetRoleId);
  }

  @Post('auth/login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: { email?: string; password?: string }) {
    if (!body.email || !body.password) {
      throw new BadRequestException('Email and password are required.');
    }
    return this.authService.login(body.email, body.password);
  }

  @Get('me')
  @UseGuards(OptionalJwtAuthGuard)
  async getMe(@CurrentUser() user: AuthPayload | undefined, @Query('userId') queryUserId?: string) {
    const userId = user?.userId || queryUserId || 'demo_user_01';
    return this.authService.getCurrentUser(userId);
  }

  @Get('me/account')
  @UseGuards(JwtAuthGuard)
  async getAccount(@CurrentUser() user: AuthPayload) {
    return this.authService.getCurrentUser(user.userId);
  }

  @Patch('me/profile')
  @UseGuards(JwtAuthGuard)
  async updateProfile(@CurrentUser() user: AuthPayload, @Body() body: { fullName?: string; targetRoleId?: string; githubUrl?: string; portfolioUrl?: string; bio?: string }) {
    return this.authService.updateProfile(user.userId, body);
  }

  @Post('me/skills/declare')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async declareSkill(@CurrentUser() user: AuthPayload, @Body() body: { skillId?: string; proficiencyScore?: number }) {
    if (!body.skillId) {
      throw new BadRequestException('skillId is required');
    }
    return this.authService.declareSkill(user.userId, body.skillId, body.proficiencyScore);
  }

  @Get('me/gaps')
  async getGaps(@Query('userId') queryUserId?: string, @Query('roleId') roleId?: string) {
    const userId = queryUserId || 'demo_user_01';
    return this.authService.getGaps(userId, roleId);
  }

  @Get('me/recommendations')
  async getRecommendations(@Query('userId') queryUserId?: string) {
    const userId = queryUserId || 'demo_user_01';
    return this.authService.getRecommendations(userId);
  }

  @Get('me/report')
  async getCareerReport(@Query('userId') queryUserId?: string, @Query('roleId') roleId?: string) {
    const userId = queryUserId || 'demo_user_01';
    return this.authService.getCareerReport(userId, roleId);
  }
}
