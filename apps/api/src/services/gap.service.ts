import { SkillGap, Role, SkillEvidence } from '@skillbridge/types';
import { store } from '../store';

export class GapService {
  /**
   * Calculates deterministic, explainable skill gaps for a user against a target role.
   * Priority = role_weight * market_demand * (1 - demonstrated_proficiency)
   */
  public async calculateGaps(userId: string, roleId: string): Promise<SkillGap[]> {
    const role: Role | undefined = await store.getRole(roleId);
    if (!role) {
      throw new Error(`Role ${roleId} not found`);
    }

    const userEvidenceList: SkillEvidence[] = await store.getEvidence(userId);

    const gaps: SkillGap[] = role.roleSkills.map(rs => {
      const skillName = rs.skill ? rs.skill.canonicalName : rs.skillId;

      const relevantEvidence = userEvidenceList.filter(e => e.skillId === rs.skillId);

      let proficiency = 0.0;
      let evidenceTypeSummary = 'No demonstrated evidence';

      if (relevantEvidence.length > 0) {
        const assessmentEvidence = relevantEvidence.find(e => e.sourceType === 'ASSESSMENT');
        const selfReportedEvidence = relevantEvidence.find(e => e.sourceType === 'SELF_REPORTED');

        if (assessmentEvidence) {
          proficiency = assessmentEvidence.proficiencyScore;
          evidenceTypeSummary = `Verified via diagnostic test (${Math.round(proficiency * 100)}%)`;
        } else if (selfReportedEvidence) {
          proficiency = selfReportedEvidence.proficiencyScore * 0.5;
          evidenceTypeSummary = `Self-reported only (estimated at ${Math.round(proficiency * 100)}%)`;
        }
      }

      const rawPriority = rs.roleWeight * rs.marketDemandFrequency * (1.0 - proficiency);
      const priorityScore = parseFloat(rawPriority.toFixed(4));

      let status: 'MAINTAIN' | 'MINOR_GAP' | 'MAJOR_GAP';
      if (proficiency >= 0.75) {
        status = 'MAINTAIN';
      } else if (proficiency >= 0.40) {
        status = 'MINOR_GAP';
      } else {
        status = 'MAJOR_GAP';
      }

      let explanation = '';
      if (status === 'MAINTAIN') {
        explanation = `Strong demonstrated competency in ${skillName}. Meets or exceeds the target threshold for ${role.title}.`;
      } else if (status === 'MINOR_GAP') {
        explanation = `Moderate baseline in ${skillName} (${evidenceTypeSummary}). High market demand (${Math.round(rs.marketDemandFrequency * 100)}%) makes this a high-ROI area for practical refinement.`;
      } else {
        explanation = `Critical gap: ${skillName} is heavily weighted (${Math.round(rs.roleWeight * 100)}%) and demanded in ${Math.round(rs.marketDemandFrequency * 100)}% of postings. Requires immediate hands-on project practice.`;
      }

      return {
        id: `gap_${userId}_${rs.skillId}`,
        userId,
        roleId,
        skillId: rs.skillId,
        skillName,
        roleWeight: rs.roleWeight,
        marketDemand: rs.marketDemandFrequency,
        demonstratedProficiency: parseFloat(proficiency.toFixed(2)),
        priorityScore,
        explanation,
        status
      };
    });

    gaps.sort((a, b) => b.priorityScore - a.priorityScore);

    return gaps;
  }
}

export const gapService = new GapService();
