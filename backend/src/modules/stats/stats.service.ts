import { Injectable } from '@nestjs/common';
import { store } from '../../store';

@Injectable()
export class StatsService {
  async getLandingStats() {
    const [jobs, skills] = await Promise.all([store.getJobs(), store.getSkills()]);
    return {
      jobPostings: jobs.length,
      canonicalSkills: skills.length,
      validationPercent: 100
    };
  }
}
