import { Controller, Get, Post, Body, Inject, HttpCode, HttpStatus } from '@nestjs/common';
import { NestSandboxService } from './sandbox.service';

@Controller('sandbox')
export class SandboxController {
  constructor(@Inject(NestSandboxService) private readonly sandboxService: NestSandboxService) {}

  @Get('challenges')
  getChallenges() {
    return this.sandboxService.getChallenges();
  }

  @Post('run-sql')
  @HttpCode(HttpStatus.OK)
  async runSQL(@Body() body: { challengeId: string; query: string; userId?: string }) {
    return this.sandboxService.runSQL(body.challengeId, body.query, body.userId || 'demo_user_01');
  }

  @Post('run-code')
  @HttpCode(HttpStatus.OK)
  async runCode(@Body() body: { challengeId: string; code: string; userId?: string }) {
    return this.sandboxService.runCode(body.challengeId, body.code, body.userId || 'demo_user_01');
  }
}
