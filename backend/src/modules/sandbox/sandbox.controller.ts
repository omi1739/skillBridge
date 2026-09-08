import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Inject,
  HttpCode,
  HttpStatus,
  UseGuards
} from '@nestjs/common';
import { NestSandboxService } from './sandbox.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthPayload } from '../../services/auth.service';
import { RunSqlDto, RunCodeDto } from '../../dto/sandbox.dto';
import { RateLimitGuard } from '../../common/rate-limit.guard';
import { RateLimit, RateWindow } from '../../common/rate-limit.decorators';

@Controller('sandbox')
export class SandboxController {
  constructor(@Inject(NestSandboxService) private readonly sandboxService: NestSandboxService) {}

  @Get('challenges')
  getChallenges() {
    return this.sandboxService.getChallenges();
  }

  @Get('generator/status')
  getGeneratorStatus() {
    return this.sandboxService.getGeneratorStatus();
  }

  @Post('generate')
  @UseGuards(RateLimitGuard)
  @RateLimit(10)
  @RateWindow(60_000)
  async generateChallenge(@Body() body: { type?: string; skillId?: string; difficulty?: string }) {
    return this.sandboxService.generateChallenge(
      (body.type || 'SQL') as 'SQL' | 'JAVASCRIPT',
      body.skillId,
      body.difficulty
    );
  }

  @Get('reference-solution/:challengeId')
  @UseGuards(RateLimitGuard)
  @RateLimit(30)
  @RateWindow(60_000)
  async referenceSolution(@Param('challengeId') challengeId: string) {
    return this.sandboxService.getReferenceSolution(challengeId);
  }

  @Post('run-sql')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @UseGuards(RateLimitGuard)
  @RateLimit(60)
  @RateWindow(60_000)
  async runSQL(
    @CurrentUser() user: AuthPayload,
    @Body() body: RunSqlDto
  ) {
    return this.sandboxService.runSQL(body.challengeId, body.query, user.userId);
  }

  @Post('run-code')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @UseGuards(RateLimitGuard)
  @RateLimit(60)
  @RateWindow(60_000)
  async runCode(
    @CurrentUser() user: AuthPayload,
    @Body() body: RunCodeDto
  ) {
    return this.sandboxService.runCode(body.challengeId, body.code, user.userId);
  }
}
