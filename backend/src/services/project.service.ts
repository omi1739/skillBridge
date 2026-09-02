import { ProjectEvidence, SkillEvidence } from '@skillbridge/types';
import { store } from '../store';
import { gapService } from './gap.service';

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
  ): Promise<{ project: ProjectEvidence; verifiedSkills: string[] }> {
    const userProjects = await store.getProjects(userId);

    const descLower = (data.description + ' ' + data.title + ' ' + data.repoUrl).toLowerCase();

    const hasDocker = descLower.includes('docker') || descLower.includes('compose');
    const hasTests = descLower.includes('test') || descLower.includes('jest') || descLower.includes('mocha');
    const hasReadme = true;

    const detectedStack: string[] = ['JavaScript / TypeScript'];
    if (descLower.includes('node') || descLower.includes('express')) detectedStack.push('Node.js / Express');
    if (descLower.includes('postgres') || descLower.includes('sql')) detectedStack.push('PostgreSQL');
    if (hasDocker) detectedStack.push('Docker');
    if (hasTests) detectedStack.push('Unit & Integration Tests');

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
      commitCountEstimate: Math.floor(Math.random() * 30) + 20,
      verificationStatus: 'VERIFIED',
      submittedAt: new Date().toISOString()
    };

    userProjects.push(project);
    await store.saveProjects(userId, userProjects);

    // Record high-confidence PROJECT evidence for primary skills
    const userEvidence = await store.getEvidence(userId);
    const verifiedSkills: string[] = [];

    for (const skillName of data.primarySkills) {
      const skillId = SKILL_MAPPING[skillName] || `skill_${skillName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      verifiedSkills.push(skillName);

      const existingIdx = userEvidence.findIndex(e => e.skillId === skillId && e.sourceType === 'PROJECT');
      const newEv: SkillEvidence = {
        id: `ev_proj_${Date.now()}_${skillId}`,
        userId,
        skillId,
        sourceType: 'PROJECT',
        sourceId: project.id,
        proficiencyScore: 0.90,
        confidence: 'HIGH',
        metadata: {
          repoUrl: project.repoUrl,
          hasTests,
          hasDocker
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

    // Mark matching CAPSTONE recommendations completed
    const recs = await store.getRecommendations(userId);
    for (const rec of recs) {
      if (rec.type === 'CAPSTONE_PROJECT') {
        await store.updateRecommendationStatus(userId, rec.id, 'COMPLETED');
      }
    }

    // Recalculate skill gaps
    await gapService.calculateGaps(userId, 'role_junior_backend');

    return { project, verifiedSkills };
  }
}

export const projectService = new ProjectService();
