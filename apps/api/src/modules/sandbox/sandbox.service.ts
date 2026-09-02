import { Injectable, BadRequestException } from '@nestjs/common';
import { sandboxService } from '../../services/sandbox.service';

@Injectable()
export class NestSandboxService {
  getChallenges() {
    return sandboxService.getChallenges();
  }

  async runSQL(challengeId: string, query: string, userId: string = 'demo_user_01') {
    if (!challengeId || !query) {
      throw new BadRequestException('challengeId and query are required');
    }
    return sandboxService.executeSQL(challengeId, query, userId);
  }

  async runCode(challengeId: string, code: string, userId: string = 'demo_user_01') {
    if (!challengeId || !code) {
      throw new BadRequestException('challengeId and code are required');
    }
    return sandboxService.executeJavaScript(challengeId, code, userId);
  }
}
