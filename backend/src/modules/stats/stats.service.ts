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
  remoteJobs: number;
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

    const [jobs, skills, curricula, assessments] = await Promise.all([
      store.getJobs(),
      store.getSkills(),
      curriculumService.getCurricula(),
      store.getAssessments()
    ]);
    const uniqueCompanies = new Set(jobs.map((j: JobListing) => j.company)).size;
    // "Validation" = how much of the canonical skill set is underpinned by
    // assessment content. Compute it from real coverage instead of a hardcoded
    // constant so the landing figure cannot overstate the platform's maturity.
    const assessedSkillIds = new Set(
      assessments.map(a => a.skillId).filter((id): id is string => Boolean(id))
    );
    const skillsWithCoverage = skills.filter(s => assessedSkillIds.has(s.id)).length;
    const validationPercent = skills.length > 0
      ? Math.round((skillsWithCoverage / skills.length) * 100)
      : 0;
    const stats: LandingStats = {
      jobPostings: jobs.length,
      canonicalSkills: skills.length,
      validationPercent,
      curriculaCount: curricula.length,
      activeCompanies: uniqueCompanies,
      remoteJobs: jobs.filter((j: JobListing) => !!j.isRemote).length
    };

    await this.cacheInstance.set(this.CACHE_KEY, stats, this.CACHE_TTL);
    return stats;
  }
}
