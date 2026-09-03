import { Injectable, NotFoundException } from '@nestjs/common';
import { store } from '../../store';
import { matchService } from '../../services/match.service';

@Injectable()
export class JobsService {
  async getJobs(sort: 'priority' | 'recent' = 'priority') {
    return store.getJobs(sort);
  }

  async getMatches(userId: string = 'demo_user_01') {
    return matchService.matchAllJobs(userId);
  }

  async matchJob(userId: string, jobId: string) {
    const exists = await store.getJobs();
    if (!exists.some(j => j.id === jobId)) {
      throw new NotFoundException(`Job ${jobId} not found.`);
    }
    return matchService.matchJob(userId, jobId);
  }
}
