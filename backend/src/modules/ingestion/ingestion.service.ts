import { Injectable, Logger, Optional, Inject } from '@nestjs/common';
import { store } from '../../store';
import { query } from '../../db/client';
import { Skill, JobListing, MarketDemandResponse, MarketDemandStat } from '@skillbridge/types';
import { CacheService } from '../../common/cache.service';

const TARGET_ROLE = 'role_junior_backend';

// Keywords that indicate a posting is a backend engineering role. A job is
// classified as backend when its title/description matches one of these OR it
// matches at least one canonical backend skill from the ontology.
const BACKEND_HINTS = [
  'backend', 'back-end', 'back end', 'node.js', 'nodejs', 'node ', 'express',
  'nest', 'postgres', 'sql', 'api', 'microservice', 'distributed system',
  'server', 'server-side', 'cloud', 'devops', 'docker', 'redis'
];

interface RawJob {
  externalId: string;
  title: string;
  company: string;
  location: string;
  description: string;
  postingUrl: string;
  postedAt?: string;
}

interface ArbeitnowItem {
  slug?: string;
  company_name?: string;
  title?: string;
  description?: string;
  remote?: boolean;
  url?: string;
  tags?: string[];
  job_types?: string[];
  location?: string;
  created_at?: string;
}

@Injectable()
export class IngestionService {
  private readonly logger = new Logger('IngestionService');
  private readonly cacheInstance: CacheService;

  constructor(@Optional() @Inject(CacheService) cache?: CacheService) {
    this.cacheInstance = cache || new CacheService();
  }

  /**
   * Pull live backend job postings from a compliant public job API and write
   * them (with full provenance: source, external id, posting url) into the
   * store, then recompute market demand from the resulting dataset.
   */
  async ingest(params?: { sourceUrl?: string; minMatches?: number }): Promise<{
    fetched: number;
    classified: number;
    inserted: number;
    updated: number;
    recomputedRoles: number;
    totalJobs: number;
    source: string;
  }> {
    const sourceUrl = params?.sourceUrl || process.env.JOB_API_URL || 'https://www.arbeitnow.com/api/job-board-api';
    const minMatches = params?.minMatches ?? 1;
    const sourceName = (process.env.JOB_SOURCE_NAME || 'Arbeitnow').trim();
    const sourceId = await store.ensureJobSource(sourceName, 'API', 'Free public job-board API. Link back and do not abuse. See Arbeitnow terms of service.');

    const skills = await store.getSkills();
    const raw = await this.fetchRaw(sourceUrl);

    const built: Array<Parameters<typeof store.upsertJobs>[0][number]> = [];
    for (const item of raw) {
      const classification = this.classifyAndMatch(item, skills, minMatches);
      if (!classification) continue;
      built.push({
        externalId: String(item.externalId),
        sourceId,
        title: classification.title,
        company: classification.company,
        location: classification.location,
        experienceLevel: '',
        roleId: TARGET_ROLE,
        description: classification.description,
        postingUrl: classification.postingUrl,
        postedAt: classification.postedAt,
        requiredSkillIds: classification.requiredSkills,
        preferredSkillIds: classification.preferredSkills
      });
    }

    let inserted = 0;
    let updated = 0;
    if (built.length > 0) {
      const res = await store.upsertJobs(built);
      inserted = res.inserted;
      updated = res.updated;
    }

    const recomputed = await store.recomputeMarketDemand();
    await this.bustCaches();

    this.logger.log(
      `Ingestion complete: fetched=${raw.length} classified=${built.length} inserted=${inserted} updated=${updated} totalJobs=${recomputed.totalJobs}`
    );
    return {
      fetched: raw.length,
      classified: built.length,
      inserted,
      updated,
      recomputedRoles: recomputed.updatedRoles,
      totalJobs: recomputed.totalJobs,
      source: sourceName
    };
  }

  /**
   * Return the computed market demand for a role with full provenance so the
   * UI can show exactly where each percentage comes from.
   */
  async getMarketDemand(roleId: string = TARGET_ROLE): Promise<MarketDemandResponse> {
    const cacheKey = `market:demand:${roleId}:v1`;
    const cached = await this.cacheInstance.get<MarketDemandResponse>(cacheKey);
    if (cached) return cached;

    const [roles, jobs, sources] = await Promise.all([
      store.getRoles(),
      store.getJobsForRole(roleId),
      store.getJobSources()
    ]);
    const role = roles.find(r => r.id === roleId);
    const totalJobs = jobs.length;

    const skills = await store.getSkills();
    const skillMap = new Map(skills.map(s => [s.id, s]));
    const skillCount = new Map<string, number>();
    for (const j of jobs) {
      const seen = new Set<string>();
      for (const sId of [...j.requiredSkillIds, ...j.preferredSkillIds]) {
        if (!seen.has(sId)) {
          seen.add(sId);
          skillCount.set(sId, (skillCount.get(sId) || 0) + 1);
        }
      }
    }

    const sourceNames = Array.from(new Set(sources.map(s => s.name)));
    const lastIngested = await query<{ ts: string | null }>(
      `SELECT MAX(created_at)::text AS ts FROM jobs WHERE role_id = $1`,
      [roleId]
    );

    const roleSkills = role?.roleSkills || [];
    const skillsOut: MarketDemandStat[] = roleSkills.map(rs => {
      const jobsRequiring = skillCount.get(rs.skillId) || 0;
      return {
        skillId: rs.skillId,
        canonicalName: skillMap.get(rs.skillId)?.canonicalName || rs.skillId,
        required: rs.required,
        roleWeight: rs.roleWeight,
        marketDemandFrequency: totalJobs > 0 ? jobsRequiring / totalJobs : 0,
        jobsRequiring,
        totalJobs,
        sourceName: sourceNames[0] || 'Manual',
        sources: sourceNames,
        lastIngestedAt: lastIngested[0]?.ts || null
      };
    });

    const response: MarketDemandResponse = {
      roleId,
      roleTitle: role?.title || roleId,
      totalJobs,
      lastIngestedAt: lastIngested[0]?.ts || null,
      sources: sourceNames,
      skills: skillsOut.sort((a, b) => b.marketDemandFrequency - a.marketDemandFrequency)
    };

    await this.cacheInstance.set(cacheKey, response, 120);
    return response;
  }

  private async fetchRaw(sourceUrl: string): Promise<RawJob[]> {
    const maxPages = Math.max(1, Number(process.env.JOB_API_PAGES || 3));
    const out: RawJob[] = [];
    for (let page = 1; page <= maxPages; page++) {
      const url = sourceUrl.includes('?') ? `${sourceUrl}&page=${page}` : `${sourceUrl}?page=${page}`;
      try {
        const control = await fetch(url, {
          headers: { 'user-agent': 'SkillBridge-LaborMarketIntelligence/1.0 (+https://skillbridge.org)' }
        });
        if (!control.ok) {
          this.logger.warn(`Job API returned ${control.status} on page ${page}; stopping.`);
          break;
        }
        const json: any = await control.json();
        const items: ArbeitnowItem[] = Array.isArray(json) ? json : json.data;
        if (!items || items.length === 0) break;
        for (const it of items) {
          const description = this.stripHtml(it.description || '');
          if (!it.title || !description) continue;
          out.push({
            externalId: String(it.slug || it.url || `${it.title}|${it.company_name}`),
            title: it.title.trim(),
            company: it.company_name || 'Unknown',
            location: it.location || '',
            description,
            postingUrl: it.url || '',
            postedAt: this.toIsoDate(it.created_at)
          });
        }
        // Polite throttle between pages.
        if (page < maxPages) await this.sleep(1500);
      } catch (err: any) {
        this.logger.warn(`Job API fetch failed on page ${page}: ${err.message}`);
        break;
      }
    }
    return out;
  }

  private classifyAndMatch(
    item: RawJob,
    skills: Skill[],
    minMatches: number
  ): {
    title: string;
    company: string;
    location: string;
    description: string;
    postingUrl: string;
    postedAt?: string;
    requiredSkills: string[];
    preferredSkills: string[];
  } | null {
    const haystack = `${item.title} ${item.description}`.toLowerCase();
    const isBackendByHint = BACKEND_HINTS.some(h => haystack.includes(h));

    const matched: { skill: Skill; confidence: number }[] = [];
    for (const s of skills) {
      const tokens = [s.canonicalName, ...(s.aliases || [])]
        .filter(Boolean)
        .map(t => t.toLowerCase());
      if (tokens.some(tok => isWholeWordOrSubmatch(haystack, tok))) {
        matched.push({ skill: s, confidence: 1 });
      }
    }

    // A backend hint alone is a weak signal; require the min skill matches
    // unless a strong backend title keyword was present.
    const strongTitleHint = /backend|back-end|back end|node|express|nest|devops|api/.test(item.title.toLowerCase());
    if (!isBackendByHint && !strongTitleHint) return null;
    if (!strongTitleHint && matched.length < minMatches) return null;

    const required = matched.map(m => m.skill.id);
    // Jobs that reference a backend skill almost always REQUIRE it; anything
    // matched beyond the core "must-have" set is treated as preferred.
    const coreRequired = ['skill_nodejs', 'skill_sql', 'skill_rest_api', 'skill_postgresql', 'skill_javascript'];
    const requiredSkills = required.filter(id => coreRequired.includes(id));
    const preferredSkills = required.filter(id => !coreRequired.includes(id));

    if (requiredSkills.length === 0 && preferredSkills.length === 0) return null;

    return {
      title: item.title,
      company: item.company,
      location: item.location,
      description: item.description.slice(0, 4000),
      postingUrl: item.postingUrl,
      postedAt: item.postedAt,
      requiredSkills,
      preferredSkills
    };
  }

  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }

  private toIsoDate(value: string | number | undefined): string | undefined {
    if (value === undefined || value === null || value === '') return undefined;
    // Arbeitnow returns Unix epoch seconds; a bare number is rejected by
    // Postgres when cast to timestamptz, so normalize to an ISO string.
    if (typeof value === 'number' || /^\d+$/.test(String(value).trim())) {
      const epoch = Number(value);
      // If it looks like milliseconds (13 digits) use as-is, else seconds.
      const ms = Math.abs(epoch) > 1e12 ? epoch : epoch * 1000;
      const d = new Date(ms);
      return isNaN(d.getTime()) ? undefined : d.toISOString();
    }
    return String(value).trim();
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(res => setTimeout(res, ms));
  }

  private async bustCaches(): Promise<void> {
    try {
      await this.cacheInstance.del('landing:stats:v2');
      await this.cacheInstance.del(`market:demand:${TARGET_ROLE}:v1`);
    } catch {
      // cache miss is fine
    }
  }
}

function isWholeWordOrSubmatch(haystack: string, token: string): boolean {
  if (!token) return false;
  // Prefer whole-word for short/single tokens to avoid false positives.
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const wordBoundary = new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i');
  return wordBoundary.test(haystack);
}
