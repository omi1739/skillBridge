import { Injectable } from '@nestjs/common';
import { store } from '../../store';
import { CacheService } from '../../common/cache.service';

export interface LandingStats {
  jobPostings: number;
  canonicalSkills: number;
  validationPercent: number;
}

@Injectable()
export class StatsService {
  private readonly CACHE_KEY = 'landing:stats';
  private readonly CACHE_TTL = 60;

  constructor(private readonly cache: CacheService) {}

  async getLandingStats(): Promise<LandingStats> {
    const cached = await this.cache.get<LandingStats>(this.CACHE_KEY);
    if (cached) {
      return cached;
    }

    const [jobs, skills] = await Promise.all([store.getJobs(), store.getSkills()]);
    const stats: LandingStats = {
      jobPostings: jobs.length,
      canonicalSkills: skills.length,
      validationPercent: 100
    };

    await this.cache.set(this.CACHE_KEY, stats, this.CACHE_TTL);
    return stats;
  }
}
