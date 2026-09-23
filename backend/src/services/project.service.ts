import { ProjectEvidence, SkillEvidence } from '@skillbridge/types';
import { store } from '../store';
import { gapService } from './gap.service';
import { GitHubVerifier, githubVerifier, RepoVerification } from './github-verifier.service';

const SKILL_MAPPING: Record<string, string> = {
  'JavaScript': 'skill_javascript',
  'Node.js': 'skill_nodejs',
  'SQL': 'skill_sql',
  'PostgreSQL': 'skill_postgresql',
  'REST APIs': 'skill_rest_api',
  'Docker': 'skill_docker',
  'Git': 'skill_git',
  'Redis': 'skill_redis'
};

export class ProjectService {
  private readonly verifier: GitHubVerifier;

  constructor(verifier: GitHubVerifier = githubVerifier) {
    this.verifier = verifier;
  }

  public async getProjects(userId: string = 'demo_user_01'): Promise<ProjectEvidence[]> {
    return store.getProjects(userId);
  }

  public async submitProject(
    userId: string = 'demo_user_01',
    data: {
      title: string;
      repoUrl: string;
      description: string;
      primarySkills: string[];
    }
  ): Promise<{ project: ProjectEvidence; verifiedSkills: string[]; verification?: RepoVerification }> {
    const userProjects = await store.getProjects(userId);

    const descLower = (data.description + ' ' + data.title + ' ' + data.repoUrl).toLowerCase();

    // Description heuristics are only a hint. When the repository is reachable
    // the verifier's stack detection (from real files + primary language) wins,
    // and the hints backfill only what the actual repo evidence missed.
    const hintStack: string[] = [];
    if (descLower.includes('node') || descLower.includes('express')) hintStack.push('Node.js / Express');
    if (descLower.includes('postgres') || descLower.includes('sql')) hintStack.push('PostgreSQL');
    if (descLower.includes('docker')) hintStack.push('Docker');
    if (descLower.includes('test') || descLower.includes('jest') || descLower.includes('mocha')) hintStack.push('Unit & Integration Tests');

    // Verify the real repository against GitHub
    const verification = await this.verifier.verify(data.repoUrl);
    const hasTests = verification.hasTests;
    const hasDocker = verification.hasDocker;
    const hasReadme = verification.hasReadme;
    const verificationStatus: ProjectEvidence['verificationStatus'] = verification.verified
      ? 'VERIFIED'
      : verification.reachable
        ? 'NEEDS_REVIEW'
        : 'PENDING';

    const detectedStack = this.mergeStack(verification, hintStack);

    const project: ProjectEvidence = {
      id: `proj_${Date.now()}`,
      userId,
      title: data.title,
      repoUrl: data.repoUrl,
      description: data.description,
      primarySkills: data.primarySkills,
      detectedStack,
      hasTests,
      hasDocker,
      hasReadme,
      commitCountEstimate: verification.commitCount,
      verificationStatus,
      submittedAt: new Date().toISOString()
    };

    userProjects.push(project);
    await store.saveProjects(userId, userProjects);

    // Record project evidence with confidence that reflects real verification.
    const userEvidence = await store.getEvidence(userId);
    const verifiedSkills: string[] = [];
    const confidence = verification.verified ? 'HIGH' : 'MEDIUM';

    for (const skillName of data.primarySkills) {
      const skillId = SKILL_MAPPING[skillName] || `skill_${skillName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      if (verification.verified) {
        verifiedSkills.push(skillName);
      }

      const existingIdx = userEvidence.findIndex(e => e.skillId === skillId && e.sourceType === 'PROJECT');
      const newEv: SkillEvidence = {
        id: `ev_proj_${Date.now()}_${skillId}`,
        userId,
        skillId,
        sourceType: 'PROJECT',
        sourceId: project.id,
        proficiencyScore: verification.verified ? 0.90 : 0.65,
        confidence: confidence as SkillEvidence['confidence'],
        metadata: {
          repoUrl: project.repoUrl,
          hasTests,
          hasDocker,
          verificationStatus
        },
        createdAt: new Date().toISOString()
      };

      if (existingIdx >= 0) {
        userEvidence[existingIdx] = newEv;
      } else {
        userEvidence.push(newEv);
      }
    }

    await store.saveEvidence(userId, userEvidence);

    // Mark matching CAPSTONE recommendations completed only for verified repos
    if (verification.verified) {
      const recs = await store.getRecommendations(userId);
      for (const rec of recs) {
        if (rec.type === 'CAPSTONE_PROJECT') {
          await store.updateRecommendationStatus(userId, rec.id, 'COMPLETED');
        }
      }
    }

    // Recalculate skill gaps
    const roleId = await store.getTargetRoleId(userId);
    await gapService.calculateGaps(userId, roleId);

    return { project, verifiedSkills, verification };
  }

  /**
   * Merge verifier-inferred stack (real repo files + primary language) with the
   * lightweight description hints. Real file evidence wins; hints backfill only
   * labels the verifier could not detect (e.g. Express/PostgreSQL from a file
   * listing). When the repo is unreachable we keep the old heuristic behavior.
   */
  private mergeStack(verification: RepoVerification, hintStack: string[]): string[] {
    const detected = new Set<string>();
    for (const label of verification.detectedStack || []) {
      detected.add(label);
    }
    if (verification.hasDocker) detected.add('Docker');
    if (verification.hasTests) detected.add('Unit & Integration Tests');
    if (verification.reachable) {
      for (const label of hintStack) {
        detected.add(label);
      }
      return Array.from(detected).length > 0
        ? Array.from(detected)
        : Array.from(new Set(['JavaScript / TypeScript', ...hintStack]));
    }
    return Array.from(new Set(['JavaScript / TypeScript', ...hintStack]));
  }
}

export const projectService = new ProjectService();
