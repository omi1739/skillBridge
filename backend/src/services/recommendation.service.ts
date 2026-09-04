import { ActionRecommendation, SkillGap } from '@skillbridge/types';
import { gapService } from './gap.service';
import { store } from '../store';

/**
 * Generates personalized project/task recommendations directly from a user's
 * assessed skill gaps, instead of returning hardcoded demo templates. Only the
 * skills with the largest verified gaps (highest priority = role_weight *
 * market_demand * (1 - proficiency)) become actionable recommendations, capped
 * to a manageable number so the list stays focused.
 */
export class RecommendationService {
  private readonly MAX_RECOMMENDATIONS = 4;

  /**
   * Compute the user's current gaps and rebuild their recommendation list.
   */
  public async refreshRecommendations(userId: string, roleId = 'role_junior_backend'): Promise<ActionRecommendation[]> {
    const gaps = await gapService.calculateGaps(userId, roleId);
    return this.buildFromGapsAndPersist(userId, gaps);
  }

  /**
   * Build and persist recommendations from an already-computed gap list.
   */
  public async buildFromGapsAndPersist(userId: string, gaps: SkillGap[]): Promise<ActionRecommendation[]> {
    const recommendations = this.buildFromGaps(userId, gaps);
    await store.saveRecommendations(userId, recommendations);
    return recommendations;
  }

  private buildFromGaps(userId: string, gaps: SkillGap[]): ActionRecommendation[] {
    // Only work on real gaps we can act on.
    const actionable = gaps
      .filter(g => g.status === 'MAJOR_GAP' || g.status === 'MINOR_GAP')
      .sort((a, b) => b.priorityScore - a.priorityScore)
      .slice(0, this.MAX_RECOMMENDATIONS);

    return actionable.map(g => {
      const isMajor = g.status === 'MAJOR_GAP';
      const type: ActionRecommendation['type'] = isMajor ? 'CAPSTONE_PROJECT' : 'PRACTICAL_TASK';
      const priorityLevel: ActionRecommendation['priorityLevel'] =
        g.priorityScore >= 0.7 ? 'CRITICAL' : isMajor ? 'HIGH' : 'MEDIUM';
      const estimatedHours = isMajor ? 12 : 6;

      const title = isMajor
        ? `Build a production ${g.skillName} project`
        : `${g.skillName} focused practice task`;

      const description = isMajor
        ? `Close your critical ${g.skillName} gap (${Math.round((1 - g.demonstratedProficiency) * 100)}% to target, ${Math.round(g.roleWeight * 100)}% role weight, ${Math.round(g.marketDemand * 100)}% market demand). Build and ship a real-world ${g.skillName} project to production quality.`
        : `Refine your ${g.skillName} baseline with a structured hands-on task. ${Math.round(g.marketDemand * 100)}% of relevant postings demand this skill — practical repetition moves you toward the target.`;

      return {
        id: `rec_${userId}_${g.skillId}`,
        userId,
        type,
        title,
        description,
        targetSkillIds: [g.skillId],
        targetSkillNames: [g.skillName],
        estimatedHours,
        priorityLevel,
        status: 'PENDING' as const
      };
    });
  }
}

export const recommendationService = new RecommendationService();
