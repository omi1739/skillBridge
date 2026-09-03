import { Logger } from '@nestjs/common';

/**
 * Scraper for BdJobs (bdjobs.com), Bangladesh's largest job board.
 *
 * BdJobs migrated to an Angular SPA, so the client-side app now talks to
 * structured JSON APIs (no authentication, lenient rate limits). The search
 * (list) endpoint returns only a sparse education/benefits blurb, so for any
 * listing whose title looks like a software/engineering role we also fetch the
 * per-job details endpoint, which carries the full HTML job description and
 * required skills. That richer text is what the shared ingestion classifier
 * uses to determine whether the role is genuinely a backend engineering job.
 */

export interface BdJobItem {
  externalId: string;
  title: string;
  company: string;
  location: string;
  description: string;
  postingUrl: string;
  postedAt?: string;
  isRemote?: boolean;
  skillsRequired?: string;
}

interface BdApiRecord {
  Jobid?: string | number;
  jobTitle?: string;
  JobTitleBng?: string;
  companyName?: string;
  location?: string;
  jobContext?: string | null;
  jobDescription?: string | null;
  publishDate?: string;
  WorkPlace?: string;
}

interface BdApiResponse {
  message?: string;
  statuscode?: string;
  data?: BdApiRecord[];
}

interface BdDetailRecord {
  jobId?: string | number;
  JobId?: string | number;
  JobTitle?: string;
  CompnayName?: string;
  JobDescription?: string | null;
  JobWorkPlace?: string;
  JobLocation?: string;
  JobNature?: string;
  SkillsRequired?: string | null;
  SuggestedSkills?: string | null;
  experience?: string | null;
}

const LIST_URL = 'https://gateway.bdjobs.com/recruitment-account-test/api/JobSearch/GetJobSearch';
const DETAILS_URL = 'https://gateway.bdjobs.com/ActtivejobsTest/api/JobSubsystem/jobDetails';
const USER_AGENT = 'SkillBridge-LaborMarketIntelligence/1.0 (+https://skillbridge.org)';

// Cheap filter so we only spend a details call on roles that could plausibly be
// software/engineering. Real backend dev roles almost always carry one of these.
const ENGINEERING_TITLE = /backend|back-end|back end|software|developer|engineer|devops|programmer|full ?stack|frontend|node|java|python|\.net|php|web |api|system|machine learning|data engineer|c#|c\+\+|java script/i;

export class BdJobsScraper {
  private readonly logger = new Logger('BdJobsScraper');

  /**
   * Paginate the BdJobs list API, then enrich engineering-titled listings with
   * their full details description, and return the normalized candidates.
   */
  async scrape(options?: { maxPages?: number }): Promise<BdJobItem[]> {
    const maxPages = Math.max(1, options?.maxPages ?? Number(process.env.JOB_BD_PAGES || 4));
    const pageItems: BdJobItem[] = [];
    let pagesRead = 0;

    for (let page = 1; page <= maxPages; page++) {
      const url = `${LIST_URL}?isPro=1&rpp=50&pg=${page}`;
      let text: string;
      try {
        const res = await fetch(url, {
          headers: { 'user-agent': USER_AGENT, accept: 'application/json' }
        });
        if (!res.ok) {
          this.logger.warn(`BdJobs list API returned ${res.status} on page ${page}; stopping.`);
          break;
        }
        text = await res.text();
      } catch (err: any) {
        this.logger.warn(`BdJobs list API fetch failed on page ${page}: ${err.message}`);
        break;
      }

      let json: BdApiResponse;
      try {
        json = JSON.parse(text);
      } catch {
        this.logger.warn(`BdJobs returned non-JSON on page ${page}; stopping.`);
        break;
      }

      const items: BdApiRecord[] = Array.isArray(json.data) ? json.data : [];
      if (items.length === 0) break;
      pagesRead = page;

      for (const it of items) {
        const normalized = this.normalize(it);
        if (normalized) pageItems.push(normalized);
      }

      if (page < maxPages) await this.sleep(1000);
    }

    const enriched = await this.enrichEngineering(pageItems);
    this.logger.log(`BdJobs scrape: fetched ${pageItems.length} records (${pagesRead} pages), enriched ${enriched} with details.`);
    return pageItems;
  }

  /**
   * Fetch full details for engineering-titled listings (concurrency-limited,
   * resilient to failures) and merge the richer description/skills text back in.
   */
  private async enrichEngineering(items: BdJobItem[]): Promise<number> {
    const candidates = items.filter(i => ENGINEERING_TITLE.test(i.title));
    let enriched = 0;
    const poolSize = 5;
    let idx = 0;

    const worker = async () => {
      while (idx < candidates.length) {
        const item = candidates[idx++];
        const detail = await this.safeFetchDetails(item.externalId);
        if (!detail) continue;
        item.description = detail.description || item.description;
        item.skillsRequired = detail.skillsRequired;
        if (detail.description) enriched++;
        await this.sleep(150);
      }
    };

    await Promise.all(Array.from({ length: poolSize }, () => worker()));
    return enriched;
  }

  private async safeFetchDetails(jobId: string): Promise<{ description?: string; skillsRequired?: string } | null> {
    const url = `${DETAILS_URL}?jobId=${encodeURIComponent(jobId)}`;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch(url, {
          headers: { 'user-agent': USER_AGENT, accept: 'application/json' }
        });
        if (!res.ok) continue;
        const json: any = await res.json();
        const rec: BdDetailRecord | undefined = Array.isArray(json?.data) ? json.data[0] : json?.data;
        if (!rec || !(rec.JobId || rec.jobId)) return null;
        const html = [rec.JobDescription, rec.SkillsRequired]
          .filter(Boolean)
          .join(' ');
        const description = this.stripHtml(html).slice(0, 4000);
        return {
          description,
          skillsRequired: this.stripHtml(rec.SkillsRequired || '')
        };
      } catch {
        // transient network error; retry once
      }
    }
    return null;
  }

  private normalize(it: BdApiRecord): BdJobItem | null {
    const rawId = it.Jobid;
    const title = (it.jobTitle || it.JobTitleBng || '').trim();
    const company = (it.companyName || '').trim();
    if (!rawId || !title || !company) return null;

    const context = this.stripHtml(it.jobContext || '');
    const description = this.stripHtml(it.jobDescription || '');
    const combined = [context, description].filter(Boolean).join(' ').slice(0, 4000);

    return {
      externalId: String(rawId),
      title,
      company,
      location: (it.location || '').trim(),
      description: combined,
      postingUrl: `https://bdjobs.com/h/details/${String(rawId)}?ln=1`,
      postedAt: this.toIsoDate(it.publishDate || ''),
      isRemote: this.isRemotePosting(it)
    };
  }

  private isRemotePosting(it: BdApiRecord): boolean {
    const place = (it.WorkPlace || '').toLowerCase();
    if (/(remote|work from home|wfh|hybrid|fully remote)/.test(place)) return true;
    const location = (it.location || '').toLowerCase();
    return /(remote|work from home|wfh)/.test(location);
  }

  private stripHtml(html: string | null | undefined): string {
    if (!html) return '';
    return html
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\u00a0/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private toIsoDate(value: string | undefined): string | undefined {
    if (!value) return undefined;
    const d = new Date(value);
    return isNaN(d.getTime()) ? undefined : d.toISOString();
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(res => setTimeout(res, ms));
  }
}

export const bdJobsScraper = new BdJobsScraper();
