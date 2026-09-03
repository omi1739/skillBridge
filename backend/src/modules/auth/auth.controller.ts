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
  BadRequestException
} from '@nestjs/common';
import { NestAuthService } from './auth.service';
import { JwtAuthGuard, OptionalJwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { AuthPayload } from '../../services/auth.service';
import { RegisterDto, LoginDto, DeclareSkillDto, UpdateProfileDto, GoogleAuthDto } from '../../dto/auth.dto';

@Controller()
export class AuthController {
  constructor(@Inject(NestAuthService) private readonly authService: NestAuthService) {}

  @Post('auth/register')
  async register(@Body() body: RegisterDto) {
    if (body.password !== body.confirmPassword) {
      throw new BadRequestException('Passwords do not match.');
    }
    return this.authService.register(body.email, body.password, body.fullName, body.targetRoleId, body.currentStatus);
  }

  @Post('auth/login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: LoginDto) {
    return this.authService.login(body.email, body.password);
  }

  @Post('auth/google')
  @HttpCode(HttpStatus.OK)
  async google(@Body() body: GoogleAuthDto) {
    return this.authService.googleAuth(body.idToken, body.currentStatus);
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
