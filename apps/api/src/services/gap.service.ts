import { SkillGap, Role, SkillEvidence } from '@skillbridge/types';
import { store } from '../store';

export class GapService {
  /**
   * Calculates deterministic, explainable skill gaps for a user against a target role.
   * Priority = role_weight * market_demand * (1 - demonstrated_proficiency)
   */
  public calculateGaps(userId: string, roleId: string): SkillGap[] {
    const role: Role | undefined = store.roles.get(roleId);
    if (!role) {
      throw new Error(`Role ${roleId} not found`);
    }

    const userEvidenceList: SkillEvidence[] = store.evidence.get(userId) || [];

    const gaps: SkillGap[] = role.roleSkills.map(rs => {
      const skill = store.skills.get(rs.skillId);
      const skillName = skill ? skill.canonicalName : rs.skillId;

      // Find all evidence for this skill and compute weighted proficiency
      const relevantEvidence = userEvidenceList.filter(e => e.skillId === rs.skillId);
      
      let proficiency = 0.0;
      let evidenceTypeSummary = 'No demonstrated evidence';

      if (relevantEvidence.length > 0) {
        // Assessment evidence takes precedence over self-reported evidence
        const assessmentEvidence = relevantEvidence.find(e => e.sourceType === 'ASSESSMENT');
        const selfReportedEvidence = relevantEvidence.find(e => e.sourceType === 'SELF_REPORTED');

        if (assessmentEvidence) {
          proficiency = assessmentEvidence.proficiencyScore;
          evidenceTypeSummary = `Verified via diagnostic test (${Math.round(proficiency * 100)}%)`;
        } else if (selfReportedEvidence) {
          // Discount self-reported evidence by 50% trust factor
          proficiency = selfReportedEvidence.proficiencyScore * 0.5;
          evidenceTypeSummary = `Self-reported only (estimated at ${Math.round(proficiency * 100)}%)`;
        }
      }

      // Compute priority score (higher score = more urgent gap)
      const rawPriority = rs.roleWeight * rs.marketDemandFrequency * (1.0 - proficiency);
      const priorityScore = parseFloat(rawPriority.toFixed(4));

      // Classify gap status
      let status: 'MAINTAIN' | 'MINOR_GAP' | 'MAJOR_GAP';
      if (proficiency >= 0.75) {
        status = 'MAINTAIN';
      } else if (proficiency >= 0.40) {
        status = 'MINOR_GAP';
      } else {
        status = 'MAJOR_GAP';
      }

      // Generate explainable textual rationale
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

    // Sort by descending priority (most urgent gaps first)
    gaps.sort((a, b) => b.priorityScore - a.priorityScore);

    // Cache computed gaps in store
    store.gaps.set(userId, gaps);

    return gaps;
  }
}

export const gapService = new GapService();
