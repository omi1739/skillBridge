import {
  ProjectEvidence,
  ProjectHealthFactor,
  ProjectHealthGrade,
  ProjectHealthIssue,
  ProjectHealthIssueSeverity,
  ProjectHealthReport,
  ProjectHealthStatus,
  ProjectHealthSuggestion
} from '@skillbridge/types';
import { store } from '../store';
import { githubVerifier, GitHubVerifier, RepoVerification } from './github-verifier.service';
import { generateAIJson } from './ai/ai-provider';

/**
 * Objective signals used to score a project. Built from the stored project row
 * and, when the repository is reachable, enriched with fresh GitHub metadata
 * (archived/fork flags, last push date, primary language).
 */
export interface ProjectHealthSignals {
  title: string;
  repoUrl: string;
  description: string;
  primarySkills: string[];
  detectedStack: string[];
  hasTests: boolean;
  hasDocker: boolean;
  hasReadme: boolean;
  commitCount: number;
  reachable: boolean;
  verified: boolean;
  isArchived: boolean;
  isFork: boolean;
  lastPushedAt?: string;
  primaryLanguage?: string;
  verificationStatus: ProjectEvidence['verificationStatus'];
}

const FACTOR_WEIGHTS = {
  testing: 0.25,
  documentation: 0.15,
  devops: 0.15,
  activity: 0.2,
  recency: 0.15,
  maintenance: 0.1
} as const;

/** Map a detected stack label onto a /learn topic slug for deep-linking. */
const LEARN_TOPIC_BY_STACK: Array<{ test: RegExp; slug: string }> = [
  { test: /javascript|typescript|node/i, slug: 'javascript' },
  { test: /python/i, slug: 'python' },
  { test: /java\b/i, slug: 'java' },
  { test: /sql|postgres/i, slug: 'sql' },
  { test: /docker|kubernetes|container/i, slug: 'docker' }
];

function daysSince(iso?: string): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.round((Date.now() - t) / 86_400_000));
}

function learnSlugForStack(stack: string[]): string | undefined {
  for (const label of stack) {
    const rule = LEARN_TOPIC_BY_STACK.find(r => r.test.test(label));
    if (rule) return rule.slug;
  }
  return undefined;
}

function gradeFor(score: number): ProjectHealthGrade {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

function statusFor(score: number): ProjectHealthStatus {
  if (score >= 80) return 'HEALTHY';
  if (score >= 65) return 'FAIR';
  if (score >= 50) return 'AT_RISK';
  return 'UNHEALTHY';
}

/**
 * Deterministic project-health analysis. The score is always computed from
 * objective repository signals so the feature works with no AI configured and
 * never fails; the AI layer only enriches the narrative (issues + suggestions).
 */
export class ProjectHealthService {
  private readonly verifier: GitHubVerifier;

  constructor(verifier: GitHubVerifier = githubVerifier) {
    this.verifier = verifier;
  }

  public async checkProject(
    userId: string,
    projectId: string
  ): Promise<ProjectHealthReport | null> {
    const projects = await store.getProjects(userId);
    const project = projects.find(p => p.id === projectId);
    if (!project) return null;

    const verification = await this.safeVerify(project.repoUrl);
    const signals = this.buildSignals(project, verification);
    const report = this.score(project, signals);
    return this.enrich(userId, report, signals);
  }

  /** Live GitHub check that never throws — returns null on any failure. */
  private async safeVerify(repoUrl: string): Promise<RepoVerification | null> {
    try {
      return await this.verifier.verify(repoUrl);
    } catch {
      return null;
    }
  }

  public buildSignals(
    project: ProjectEvidence,
    verification: RepoVerification | null
  ): ProjectHealthSignals {
    const reachable = verification?.reachable === true;
    const stack = new Set<string>(project.detectedStack || []);
    if (verification?.detectedStack) {
      for (const label of verification.detectedStack) stack.add(label);
    }
    if (verification?.hasDocker) stack.add('Docker');
    if (verification?.hasTests) stack.add('Unit & Integration Tests');

    return {
      title: project.title,
      repoUrl: project.repoUrl,
      description: project.description,
      primarySkills: project.primarySkills || [],
      detectedStack: Array.from(stack),
      // Prefer fresh repo evidence; fall back to what we stored at submit time.
      hasTests: verification?.hasTests ?? project.hasTests,
      hasDocker: verification?.hasDocker ?? project.hasDocker,
      hasReadme: verification?.hasReadme ?? project.hasReadme,
      commitCount: verification?.commitCount ?? project.commitCountEstimate ?? 0,
      reachable,
      verified: verification?.verified === true,
      isArchived: verification?.isArchived === true,
      isFork: verification?.isFork === true,
      lastPushedAt: verification?.lastPushedAt,
      primaryLanguage: verification?.primaryLanguage,
      verificationStatus: project.verificationStatus
    };
  }

  /** Pure scoring pass — no I/O, easy to unit test. */
  public score(project: ProjectEvidence, s: ProjectHealthSignals): ProjectHealthReport {
    const days = daysSince(s.lastPushedAt);

    const factors: ProjectHealthFactor[] = [
      this.factor('testing', 'Automated tests', s.hasTests ? 1 : 0, FACTOR_WEIGHTS.testing,
        s.hasTests ? 'A test suite was detected in the repository.' : 'No test files or test config were detected.'),
      this.factor('documentation', 'Documentation', s.hasReadme ? 1 : s.description.length > 40 ? 0.4 : 0,
        FACTOR_WEIGHTS.documentation,
        s.hasReadme ? 'A README is present.' : 'No README found — setup and usage are undocumented.'),
      this.factor('devops', 'Reproducible setup', s.hasDocker ? 1 : 0, FACTOR_WEIGHTS.devops,
        s.hasDocker ? 'The project is containerized for reproducible setup.' : 'No Dockerfile or container config detected.'),
      this.factor('activity', 'Commit activity', this.activityScore(s.commitCount), FACTOR_WEIGHTS.activity,
        `~${s.commitCount} commits detected.`),
      this.factor('recency', 'Recent activity', this.recencyScore(days), FACTOR_WEIGHTS.recency,
        days == null ? 'Last activity date is unknown.' : `Last pushed ${days} day(s) ago.`),
      this.factor('maintenance', 'Active maintenance', s.isArchived ? 0 : s.isFork ? 0.4 : 1, FACTOR_WEIGHTS.maintenance,
        s.isArchived ? 'The repository is archived.' : s.isFork ? 'This project is a fork.' : 'Actively maintained.')
    ];

    let overallScore = Math.round(factors.reduce((sum, f) => sum + f.score * f.weight, 0) * 100);
    if (!s.reachable) {
      // Unverifiable repositories can never grade as healthy.
      overallScore = Math.min(overallScore, 55);
    }

    const issues = this.buildIssues(s, days);
    const suggestions = this.buildSuggestions(s, issues);

    return {
      projectId: project.id,
      userId: project.userId,
      title: project.title,
      repoUrl: project.repoUrl,
      overallScore,
      grade: gradeFor(overallScore),
      status: statusFor(overallScore),
      detectedStack: s.detectedStack,
      primaryLanguage: s.primaryLanguage,
      factors,
      issues,
      suggestions,
      source: 'heuristic',
      model: null,
      generatedAt: new Date().toISOString()
    };
  }

  private factor(key: string, label: string, score: number, weight: number, detail: string): ProjectHealthFactor {
    return { key, label, score: Math.max(0, Math.min(1, score)), weight, detail };
  }

  private activityScore(commits: number): number {
    if (commits >= 50) return 1;
    if (commits >= 20) return 0.8;
    if (commits >= 10) return 0.6;
    if (commits >= 5) return 0.4;
    if (commits >= 1) return 0.2;
    return 0;
  }

  private recencyScore(days: number | null): number {
    if (days == null) return 0.6;
    if (days <= 90) return 1;
    if (days <= 180) return 0.75;
    if (days <= 365) return 0.45;
    return 0.15;
  }

  private buildIssues(s: ProjectHealthSignals, days: number | null): ProjectHealthIssue[] {
    const issues: ProjectHealthIssue[] = [];

    if (!s.reachable) {
      issues.push({
        severity: 'CRIT',
        title: 'Repository could not be verified',
        detail: 'We could not reach this repository on GitHub, so its health cannot be fully assessed. Check that the URL is public and correct.'
      });
    }
    if (s.isArchived) {
      issues.push({
        severity: 'CRIT',
        title: 'Repository is archived',
        detail: 'Archived repositories are read-only and signal the project is no longer maintained.'
      });
    }
    if (!s.hasTests) {
      issues.push({
        severity: 'CRIT',
        title: 'No automated tests detected',
        detail: 'There is no evidence of unit or integration tests, which makes regressions likely and reduces reviewer confidence.'
      });
    }
    if (!s.hasReadme) {
      issues.push({
        severity: 'WARN',
        title: 'Missing README',
        detail: 'A README is essential for others to understand, set up, and evaluate the project.'
      });
    }
    if (!s.hasDocker) {
      issues.push({
        severity: 'INFO',
        title: 'No reproducible setup',
        detail: 'No Dockerfile or container configuration was found, so environment setup may be manual and error-prone.'
      });
    }
    if (s.commitCount > 0 && s.commitCount < 10) {
      issues.push({
        severity: 'WARN',
        title: 'Low commit activity',
        detail: `Only ~${s.commitCount} commits were detected — reviewers look for incremental history that shows development process.`
      });
    }
    if (days != null && days > 365) {
      issues.push({
        severity: 'WARN',
        title: 'Repository looks inactive',
        detail: `The last push was ${days} days ago (>1 year). Recruiters often read a stale repo as an abandoned project.`
      });
    } else if (days != null && days > 180) {
      issues.push({
        severity: 'INFO',
        title: 'No recent activity',
        detail: `The last push was ${days} days ago. A small recent commit can make the project look active again.`
      });
    }
    if (s.isFork) {
      issues.push({
        severity: 'WARN',
        title: 'Project is a fork',
        detail: 'Forked repositories can be read as unoriginal unless your own contributions are clearly documented.'
      });
    }
    if (s.verificationStatus === 'NEEDS_REVIEW' && !s.hasTests && s.reachable) {
      issues.push({
        severity: 'WARN',
        title: 'Verification needs review',
        detail: 'The project was received but did not meet the automatic verification bar, mainly due to missing tests.'
      });
    }

    const order: Record<ProjectHealthIssueSeverity, number> = { CRIT: 0, WARN: 1, INFO: 2 };
    return issues.sort((a, b) => order[a.severity] - order[b.severity]).slice(0, 8);
  }

  private buildSuggestions(s: ProjectHealthSignals, issues: ProjectHealthIssue[]): ProjectHealthSuggestion[] {
    const slug = learnSlugForStack(s.detectedStack);
    const suggestions: ProjectHealthSuggestion[] = [];

    if (!s.hasTests) {
      suggestions.push({
        title: 'Add an automated test suite',
        detail: 'Start with a few unit tests around your core logic, then add one integration test for the main flow. Wire them into a `npm test`/`pytest` script.',
        category: 'testing',
        learnTopicSlug: slug
      });
    }
    if (!s.hasReadme) {
      suggestions.push({
        title: 'Write a strong README',
        detail: 'Cover what the project does, a screenshot or demo link, the tech stack, setup steps, and how to run it. A good README is often the first thing a reviewer reads.',
        category: 'docs'
      });
    }
    if (!s.hasDocker) {
      suggestions.push({
        title: 'Containerize the project',
        detail: 'Add a Dockerfile (and docker-compose for databases) so reviewers can run the project with one command. This signals production awareness.',
        category: 'devops',
        learnTopicSlug: 'docker'
      });
    }
    if (s.commitCount < 10) {
      suggestions.push({
        title: 'Build a meaningful commit history',
        detail: 'Break the work into small, focused commits with clear messages rather than one large dump. It demonstrates how you work.',
        category: 'code-quality',
        learnTopicSlug: 'git'
      });
    }
    if (s.isFork) {
      suggestions.push({
        title: 'Show your own contributions',
        detail: 'Document the changes you made to the fork in the README and keep the commit history focused on your work.',
        category: 'code-quality'
      });
    }
    if (s.detectedStack.length > 1) {
      suggestions.push({
        title: 'Add continuous integration',
        detail: 'Add a CI workflow that runs your tests and linter on every push. A green build badge shows the project is healthy.',
        category: 'devops'
      });
    }
    if (s.primarySkills.length === 0) {
      suggestions.push({
        title: 'Tag the skills this project demonstrates',
        detail: 'Declare the primary skills your project proves so they count toward your verified skill evidence.',
        category: 'code-quality'
      });
    }

    // Always leave the user with at least one concrete next step.
    if (suggestions.length === 0) {
      suggestions.push({
        title: 'Keep the project polished',
        detail: 'This is a well-rounded project. Consider adding a live demo, more tests, or documentation to stand out further.',
        category: 'code-quality'
      });
    }

    void issues;
    return suggestions.slice(0, 6);
  }

  /**
   * Optionally enrich the narrative with AI-generated issues/suggestions. The
   * deterministic score and factors are always preserved; if no provider is
   * configured or the call fails, the heuristic report is returned unchanged.
   */
  private async enrich(
    _userId: string,
    report: ProjectHealthReport,
    signals: ProjectHealthSignals
  ): Promise<ProjectHealthReport> {
    const systemPrompt =
      'You are a senior software engineer reviewing a candidate\'s portfolio project. ' +
      'Given objective repository signals, produce concise, specific, actionable feedback. ' +
      'Respond ONLY with valid JSON of shape: ' +
      '{"issues":[{"severity":"CRIT|WARN|INFO","title":string,"detail":string}],' +
      '"suggestions":[{"title":string,"detail":string,"category":"testing|docs|devops|architecture|code-quality|security","learnTopicSlug":string?}]}. ' +
      'Do not invent facts beyond the provided signals. Keep titles under 60 chars and details under 240 chars. Max 6 issues and 5 suggestions.';

    const userPrompt =
      'Project: ' + JSON.stringify({
        title: signals.title,
        description: signals.description,
        detectedStack: signals.detectedStack,
        primaryLanguage: signals.primaryLanguage,
        hasTests: signals.hasTests,
        hasDocker: signals.hasDocker,
        hasReadme: signals.hasReadme,
        commitCount: signals.commitCount,
        reachable: signals.reachable,
        isArchived: signals.isArchived,
        isFork: signals.isFork,
        daysSinceLastPush: daysSince(signals.lastPushedAt),
        deterministicScore: report.overallScore
      });

    const result = await generateAIJson<{ issues?: unknown; suggestions?: unknown }>(systemPrompt, userPrompt);
    if (!result) return report;

    const aiIssues = this.sanitizeIssues(result.data?.issues);
    const aiSuggestions = this.sanitizeSuggestions(result.data?.suggestions);

    // Keep the objectively-derived CRIT issues (missing tests, archived, etc.)
    // even if the model omitted them, then layer the AI's narrative on top.
    const guaranteed = report.issues.filter(i => i.severity === 'CRIT');
    const merged = this.mergeIssues(guaranteed, aiIssues.length > 0 ? aiIssues : report.issues);

    return {
      ...report,
      issues: merged.slice(0, 8),
      suggestions: aiSuggestions.length > 0 ? aiSuggestions : report.suggestions,
      source: 'ai',
      model: result.model
    };
  }

  private sanitizeIssues(raw: unknown): ProjectHealthIssue[] {
    if (!Array.isArray(raw)) return [];
    const severities: ProjectHealthIssueSeverity[] = ['INFO', 'WARN', 'CRIT'];
    return raw
      .map((i: any) => ({
        severity: severities.includes(i?.severity) ? (i.severity as ProjectHealthIssueSeverity) : 'WARN',
        title: String(i?.title || '').slice(0, 120),
        detail: String(i?.detail || '').slice(0, 400)
      }))
      .filter(i => i.title && i.detail)
      .slice(0, 6);
  }

  private sanitizeSuggestions(raw: unknown): ProjectHealthSuggestion[] {
    if (!Array.isArray(raw)) return [];
    return raw
      .map((s: any) => ({
        title: String(s?.title || '').slice(0, 120),
        detail: String(s?.detail || '').slice(0, 400),
        category: String(s?.category || 'code-quality').slice(0, 40),
        learnTopicSlug: s?.learnTopicSlug ? String(s.learnTopicSlug).slice(0, 40) : undefined
      }))
      .filter(s => s.title && s.detail)
      .slice(0, 5);
  }

  private mergeIssues(base: ProjectHealthIssue[], extra: ProjectHealthIssue[]): ProjectHealthIssue[] {
    const seen = new Set<string>();
    const out: ProjectHealthIssue[] = [];
    const key = (i: ProjectHealthIssue) => i.title.toLowerCase().replace(/[^a-z0-9]/g, '');
    for (const issue of [...base, ...extra]) {
      const k = key(issue);
      if (k && !seen.has(k)) {
        seen.add(k);
        out.push(issue);
      }
    }
    const order: Record<ProjectHealthIssueSeverity, number> = { CRIT: 0, WARN: 1, INFO: 2 };
    return out.sort((a, b) => order[a.severity] - order[b.severity]);
  }
}

export const projectHealthService = new ProjectHealthService();
