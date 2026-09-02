import { Injectable } from '@nestjs/common';
import { store } from '../../store';
import { matchService } from '../../services/match.service';

@Injectable()
export class JobsService {
  async getJobs() {
    return store.getJobs();
  }

  async getMatches(userId: string = 'demo_user_01') {
    return matchService.matchAllJobs(userId);
  }
}
