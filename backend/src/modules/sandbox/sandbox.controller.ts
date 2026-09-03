import {
  Controller,
  Get,
  Post,
  Body,
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
