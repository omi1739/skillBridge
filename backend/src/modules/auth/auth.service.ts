import { Injectable, NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { User, Profile, SkillEvidence, ActionRecommendation } from '@skillbridge/types';
import { authService, AuthPayload } from '../../services/auth.service';
import { store } from '../../store';
import { gapService } from '../../services/gap.service';

@Injectable()
export class NestAuthService {
  async register(email: string, password: string, fullName: string, targetRoleId?: string) {
    return authService.register(email, password, fullName, targetRoleId);
  }

  async login(email: string, password: string) {
    return authService.login(email, password);
  }

  async getCurrentUser(userId: string) {
    const [user, profile] = await Promise.all([
      store.getUser(userId),
      store.getProfile(userId)
    ]);

    if (!user || !profile) {
      throw new NotFoundException('User not found');
    }

    return { user, profile };
  }

  async updateProfile(userId: string, patch: Partial<Profile>) {
    const profile = await store.getProfile(userId);
    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    return store.saveProfile(userId, {
      fullName: patch.fullName ?? profile.fullName,
      targetRoleId: patch.targetRoleId ?? profile.targetRoleId,
      githubUrl: patch.githubUrl ?? profile.githubUrl,
      portfolioUrl: patch.portfolioUrl ?? profile.portfolioUrl,
      bio: patch.bio ?? profile.bio
    });
  }

  async declareSkill(userId: string, skillId: string, proficiencyScore: number = 0.6) {
    const skill = await store.getSkill(skillId);
    if (!skill) {
      throw new NotFoundException(`Skill ${skillId} not found`);
    }

    const newEvidence: SkillEvidence = {
      id: `ev_decl_${Date.now()}`,
      userId,
      skillId,
      sourceType: 'SELF_REPORTED',
      proficiencyScore,
      confidence: 'LOW',
      metadata: { note: 'Self-reported by candidate' },
      createdAt: new Date().toISOString()
    };

    await store.saveEvidence(userId, [newEvidence]);
    const gaps = await gapService.calculateGaps(userId, 'role_junior_backend');

    return { evidence: newEvidence, gaps };
  }

  async getGaps(userId: string, roleId: string = 'role_junior_backend') {
    return gapService.calculateGaps(userId, roleId);
  }

  async getRecommendations(userId: string) {
    return store.getRecommendations(userId);
  }

  async getCareerReport(userId: string, roleId: string = 'role_junior_backend') {
    const [user, profile, role, evidence, gaps, recs, projects] = await Promise.all([
      store.getUser(userId),
      store.getProfile(userId),
      store.getRole(roleId),
      store.getEvidence(userId),
      gapService.calculateGaps(userId, roleId),
      store.getRecommendations(userId),
      store.getProjects(userId)
    ]);

    if (!user || !profile) {
      throw new NotFoundException('User profile not found');
    }

    if (!role) {
      throw new NotFoundException('Target role not found');
    }

    let totalWeightedScore = 0;
    let totalMaxPossible = 0;

    for (const rs of role.roleSkills) {
      const weight = rs.roleWeight * rs.marketDemandFrequency;
      totalMaxPossible += weight;
      const gap = gaps.find(g => g.skillId === rs.skillId);
      if (gap) {
        totalWeightedScore += weight * gap.demonstratedProficiency;
      }
    }

    const alignmentIndex = totalMaxPossible > 0 ? Math.round((totalWeightedScore / totalMaxPossible) * 100) : 50;

    return {
      passportId: `SKILLBRIDGE-PASSPORT-${userId.toUpperCase()}_${Date.now().toString(16).toUpperCase()}`,
      issuedAt: new Date().toISOString(),
      candidate: {
        id: user.id,
        name: profile.fullName,
        email: user.email,
        targetRole: role.title,
        bio: profile.bio || 'Junior Backend Engineer pursuing industry placement'
      },
      metrics: {
        overallAlignment: alignmentIndex,
        totalTrackedSkills: role.roleSkills.length,
        verifiedSkillsCount: evidence.filter(e => e.confidence === 'HIGH').length,
        submittedProjectsCount: projects.length
      },
      evidence: evidence.map(ev => ({
        id: ev.id,
        skillId: ev.skillId,
        skillName: ev.skillId.replace('skill_', '').replace('_', ' ').toUpperCase(),
        sourceType: ev.sourceType,
        proficiencyScore: ev.proficiencyScore,
        confidence: ev.confidence,
        category: 'Backend'
      })),
      gaps,
      recommendations: recs,
      projects
    };
  }
}
