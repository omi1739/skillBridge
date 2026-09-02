import {
  User,
  Profile,
  Skill,
  Role,
  Assessment,
  AssessmentAttempt,
  SkillEvidence,
  SkillGap,
  ActionRecommendation,
  JobListing
} from '@skillbridge/types';
import {
  INITIAL_SKILLS,
  INITIAL_ROLES,
  INITIAL_ASSESSMENT,
  INITIAL_RECOMMENDATIONS,
  INITIAL_JOBS
} from '../data/seed';

export class AppDataStore {
  public users: Map<string, User> = new Map();
  public profiles: Map<string, Profile> = new Map();
  public skills: Map<string, Skill> = new Map();
  public roles: Map<string, Role> = new Map();
  public assessments: Map<string, Assessment> = new Map();
  public attempts: Map<string, AssessmentAttempt> = new Map();
  public evidence: Map<string, SkillEvidence[]> = new Map(); // userId -> SkillEvidence[]
  public gaps: Map<string, SkillGap[]> = new Map(); // userId -> SkillGap[]
  public recommendations: Map<string, ActionRecommendation[]> = new Map(); // userId -> ActionRecommendation[]
  public jobs: Map<string, JobListing> = new Map();

  constructor() {
    this.seed();
  }

  private seed() {
    // Populate Skills
    for (const skill of INITIAL_SKILLS) {
      this.skills.set(skill.id, skill);
    }

    // Populate Roles (enriching with full Skill objects)
    for (const role of INITIAL_ROLES) {
      const enrichedRoleSkills = role.roleSkills.map(rs => ({
        ...rs,
        skill: this.skills.get(rs.skillId)
      }));
      this.roles.set(role.id, { ...role, roleSkills: enrichedRoleSkills });
    }

    // Populate Assessments
    this.assessments.set(INITIAL_ASSESSMENT.id, INITIAL_ASSESSMENT);

    // Populate Jobs
    for (const job of INITIAL_JOBS) {
      this.jobs.set(job.id, job);
    }

    // Create a default demo user for frictionless instant testing
    const demoUser: User = {
      id: 'demo_user_01',
      email: 'candidate@skillbridge.org',
      role: 'USER',
      createdAt: new Date().toISOString()
    };
    this.users.set(demoUser.id, demoUser);

    const demoProfile: Profile = {
      id: 'profile_01',
      userId: demoUser.id,
      fullName: 'Ayman Rahman',
      targetRoleId: 'role_junior_backend',
      githubUrl: 'https://github.com/ayman-rahman',
      bio: 'Aspiring backend engineer eager to master Node.js and distributed systems.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.profiles.set(demoUser.id, demoProfile);

    // Initial self-reported baseline evidence for demo user
    const initialEvidence: SkillEvidence[] = [
      {
        id: 'ev_01',
        userId: demoUser.id,
        skillId: 'skill_javascript',
        sourceType: 'SELF_REPORTED',
        proficiencyScore: 0.70,
        confidence: 'LOW',
        createdAt: new Date().toISOString()
      },
      {
        id: 'ev_02',
        userId: demoUser.id,
        skillId: 'skill_nodejs',
        sourceType: 'SELF_REPORTED',
        proficiencyScore: 0.50,
        confidence: 'LOW',
        createdAt: new Date().toISOString()
      }
    ];
    this.evidence.set(demoUser.id, initialEvidence);

    // Initial recommendations
    this.recommendations.set(
      demoUser.id,
      INITIAL_RECOMMENDATIONS.map(r => ({ ...r, userId: demoUser.id }))
    );
  }
}

export const store = new AppDataStore();
