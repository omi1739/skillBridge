import { Injectable, BadRequestException } from '@nestjs/common';
import { sandboxService } from '../../services/sandbox.service';
import { challengeGenerator, registerDynamicChallenge } from '../../services/challenge-generator.service';
import { store } from '../../store';

@Injectable()
export class NestSandboxService {
  getChallenges() {
    return sandboxService.getChallenges();
  }

  getGeneratorStatus() {
    return { usesOpenAI: challengeGenerator.hasApiKey };
  }

  async generateChallenge(type: 'SQL' | 'JAVASCRIPT', skillId?: string, difficulty?: string) {
    if (!type || !['SQL', 'JAVASCRIPT'].includes(type)) {
      throw new BadRequestException('type must be SQL or JAVASCRIPT');
    }
    const challenge = await challengeGenerator.generate({
      type,
      skillId,
      difficulty: difficulty as any
    });
    registerDynamicChallenge(challenge);
    // Persist the freshly generated challenge so it survives restarts. This is
    // best-effort: a DB outage must never break the generate flow itself.
    try {
      await store.saveSandboxChallenge(challenge);
    } catch (err) {
      // The in-memory registry still serves the challenge for this run.
      console.warn(`[Sandbox] Failed to persist challenge ${challenge.id}: ${(err as Error).message}`);
    }
    return challenge;
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
