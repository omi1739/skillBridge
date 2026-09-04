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
  async generateChallenge(@Body() body: { type?: string; skillId?: string; difficulty?: string }) {
    return this.sandboxService.generateChallenge(
      (body.type || 'SQL') as 'SQL' | 'JAVASCRIPT',
      body.skillId,
      body.difficulty
    );
  }

  @Get('reference-solution/:challengeId')
  async referenceSolution(@Param('challengeId') challengeId: string) {
    return this.sandboxService.getReferenceSolution(challengeId);
  }

  @Post('run-sql')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async runSQL(
    @CurrentUser() user: AuthPayload | undefined,
    @Body() body: RunSqlDto
  ) {
    const candidateId = user?.userId || body.userId || 'demo_user_01';
    return this.sandboxService.runSQL(body.challengeId, body.query, candidateId);
  }

  @Post('run-code')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async runCode(
    @CurrentUser() user: AuthPayload | undefined,
    @Body() body: RunCodeDto
  ) {
    const candidateId = user?.userId || body.userId || 'demo_user_01';
    return this.sandboxService.runCode(body.challengeId, body.code, candidateId);
  }
}
