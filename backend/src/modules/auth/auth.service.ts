import { Injectable, NotFoundException, UnauthorizedException, InternalServerErrorException, HttpException } from '@nestjs/common';
import { Profile, SkillEvidence } from '@skillbridge/types';
import { authService, AuthDomainError } from '../../services/auth.service';
import { store } from '../../store';
import { gapService } from '../../services/gap.service';
import { recommendationService } from '../../services/recommendation.service';
import { googleVerifier } from '../../services/google-verifier.service';

@Injectable()
export class NestAuthService {
  /**
   * Re-throw an auth failure with the status it deserves. `AuthDomainError`
   * carries the business status (401 bad credentials, 409 conflict, 400
   * validation); anything else is genuinely unexpected, so it is logged with
   * its real cause and reported as an opaque 500 so internals never leak.
   */
  private rethrow(err: any, context: string): never {
    if (err instanceof AuthDomainError) {
      throw new HttpException(err.message, err.status);
    }
    const msg = err?.message || 'unknown error';
    console.error(`[SkillBridge] ${context} failed:`, msg);
    throw new InternalServerErrorException(`${context} failed. Please try again.`);
  }

  async register(email: string, password: string, fullName: string, targetRoleId?: string, currentStatus?: string) {
    try {
      return await authService.register(email, password, fullName, targetRoleId, currentStatus);
    } catch (err: any) {
      this.rethrow(err, 'Registration');
    }
  }

  async login(email: string, password: string) {
    try {
      return await authService.login(email, password);
    } catch (err: any) {
      this.rethrow(err, 'Sign-in');
    }
  }

  async googleAuth(idToken: string, currentStatus?: string) {
    let profileInfo;
    try {
      profileInfo = await googleVerifier.verifyGoogleIdToken(idToken);
    } catch (err: any) {
      throw new UnauthorizedException(err?.message || 'Google login failed.');
    }
    try {
      return await authService.registerOrLoginWithGoogle(profileInfo, currentStatus);
    } catch (err: any) {
      this.rethrow(err, 'Google account provisioning');
    }
  }

  async changePassword(userId: string, currentPassword: string | undefined, newPassword: string) {
    try {
      await authService.changePassword(userId, currentPassword, newPassword);
      return { success: true };
    } catch (err: any) {
      this.rethrow(err, 'Password change');
    }
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

  /**
   * Applies a profile patch. Field presence — not `??` — decides what is
   * written: the client clears a field by sending an explicit `null`, and
   * `null ?? stored` would silently keep the stored value, so no edit could
   * ever blank a bio or link. Absent keys are left untouched.
   */
  async updateProfile(userId: string, patch: Partial<Profile>) {
    const profile = await store.getProfile(userId);
    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    const pick = <K extends keyof Profile>(key: K): Profile[K] | undefined =>
      key in patch ? (patch[key] ?? undefined) : profile[key];

    return store.saveProfile(userId, {
      fullName: pick('fullName') ?? profile.fullName,
      targetRoleId: pick('targetRoleId'),
      githubUrl: pick('githubUrl'),
      portfolioUrl: pick('portfolioUrl'),
      bio: pick('bio')
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
    const targetRole = (await store.getProfile(userId))?.targetRoleId || 'role_full_stack';
    const gaps = await gapService.calculateGaps(userId, targetRole);

    return { evidence: newEvidence, gaps };
  }

  async getGaps(userId: string, roleId: string = 'role_full_stack') {
    return gapService.calculateGaps(userId, roleId);
  }

  async getRecommendations(userId: string, roleId: string = 'role_full_stack') {
    return recommendationService.refreshRecommendations(userId, roleId);
  }

  async getCareerReport(userId: string, roleId: string = 'role_full_stack') {
    const [user, profile, role, evidence, gaps, projects] = await Promise.all([
      store.getUser(userId),
      store.getProfile(userId),
      store.getRole(roleId),
      store.getEvidence(userId),
      gapService.calculateGaps(userId, roleId),
      store.getProjects(userId)
    ]);

    if (!user || !profile) {
      throw new NotFoundException('User profile not found');
    }

    if (!role) {
      throw new NotFoundException('Target role not found');
    }

    const recs = await recommendationService.buildFromGapsAndPersist(userId, gaps);

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
