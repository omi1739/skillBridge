import { Injectable, Optional, Inject } from '@nestjs/common';
import { store } from '../../store';
import { CacheService } from '../../common/cache.service';
import { curriculumService } from '../../services/curriculum.service';
import { JobListing } from '@skillbridge/types';

export interface LandingStats {
  jobPostings: number;
  canonicalSkills: number;
  validationPercent: number;
  curriculaCount: number;
  activeCompanies: number;
}

@Injectable()
export class StatsService {
  private readonly CACHE_KEY = 'landing:stats:v2';
  private readonly CACHE_TTL = 60;
  private readonly cacheInstance: CacheService;

  constructor(@Optional() @Inject(CacheService) cache?: CacheService) {
    this.cacheInstance = cache || new CacheService();
  }

  async getLandingStats(): Promise<LandingStats> {
    const cached = await this.cacheInstance.get<LandingStats>(this.CACHE_KEY);
    if (cached) {
      return cached;
    }

    const [jobs, skills, curricula] = await Promise.all([
      store.getJobs(),
      store.getSkills(),
      curriculumService.getCurricula()
    ]);
    const uniqueCompanies = new Set(jobs.map((j: JobListing) => j.company)).size;
    const stats: LandingStats = {
      jobPostings: jobs.length,
      canonicalSkills: skills.length,
      validationPercent: 100,
      curriculaCount: curricula.length,
      activeCompanies: uniqueCompanies
    };

    await this.cacheInstance.set(this.CACHE_KEY, stats, this.CACHE_TTL);
    return stats;
  }
}
