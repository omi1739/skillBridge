import { ProjectEvidence, SkillEvidence } from '@skillbridge/types';
import { store } from '../store';
import { gapService } from './gap.service';

export class ProjectService {
  private projects: Map<string, ProjectEvidence[]> = new Map(); // userId -> ProjectEvidence[]

  constructor() {
    // Seed an initial demo project
    const initialDemoProject: ProjectEvidence = {
      id: 'proj_demo_01',
      userId: 'demo_user_01',
      title: 'E-Commerce Backend REST API with PostgreSQL',
      repoUrl: 'https://github.com/ayman-rahman/ecommerce-backend-api',
      description: 'Production-ready Node.js REST API with authentication (JWT), raw PostgreSQL queries with indexes, multi-stage Dockerfile, and integration tests.',
      primarySkills: ['Node.js', 'PostgreSQL', 'REST APIs', 'Docker'],
      detectedStack: ['TypeScript', 'Express', 'PostgreSQL', 'Docker', 'Jest'],
      hasTests: true,
      hasDocker: true,
      hasReadme: true,
      commitCountEstimate: 42,
      verificationStatus: 'VERIFIED',
      submittedAt: new Date(Date.now() - 86400000 * 2).toISOString()
    };
    this.projects.set('demo_user_01', [initialDemoProject]);
  }

  public getProjects(userId: string = 'demo_user_01'): ProjectEvidence[] {
    return this.projects.get(userId) || [];
  }

  public submitProject(
    userId: string = 'demo_user_01',
    data: {
      title: string;
      repoUrl: string;
      description: string;
      primarySkills: string[];
    }
  ): { project: ProjectEvidence; verifiedSkills: string[] } {
    const userProjects = this.projects.get(userId) || [];

    // Parse repository signals from input & repository heuristics
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
    this.projects.set(userId, userProjects);

    // Map primary skill names to canonical skill IDs and record high-confidence PROJECT evidence
    const skillMapping: Record<string, string> = {
      'JavaScript': 'skill_javascript',
      'Node.js': 'skill_nodejs',
      'SQL': 'skill_sql',
      'PostgreSQL': 'skill_postgresql',
      'REST APIs': 'skill_rest_api',
      'Docker': 'skill_docker',
      'Git': 'skill_git',
      'Redis': 'skill_redis'
    };

    const userEvidence = store.evidence.get(userId) || [];
    const verifiedSkills: string[] = [];

    for (const skillName of data.primarySkills) {
      const skillId = skillMapping[skillName] || `skill_${skillName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      verifiedSkills.push(skillName);

      const existingIdx = userEvidence.findIndex(e => e.skillId === skillId && e.sourceType === 'PROJECT');
      const newEv: SkillEvidence = {
        id: `ev_proj_${Date.now()}_${skillId}`,
        userId,
        skillId,
        sourceType: 'PROJECT',
        sourceId: project.id,
        proficiencyScore: 0.90, // High project competency score
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

    store.evidence.set(userId, userEvidence);

    // Update matching Capstone recommendations to COMPLETED
    const recs = store.recommendations.get(userId) || [];
    for (const rec of recs) {
      if (rec.type === 'CAPSTONE_PROJECT') {
        rec.status = 'COMPLETED';
      }
    }
    store.recommendations.set(userId, recs);

    // Recalculate skill gaps
    gapService.calculateGaps(userId, 'role_junior_backend');

    return { project, verifiedSkills };
  }
}

export const projectService = new ProjectService();
