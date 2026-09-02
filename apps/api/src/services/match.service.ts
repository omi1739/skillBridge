import { JobListing, JobMatchResult, SkillEvidence } from '@skillbridge/types';
import { store } from '../store';

export class MatchService {
  /**
   * Evaluates job compatibility based on demonstrated candidate evidence.
   */
  public matchJob(userId: string, jobId: string): JobMatchResult {
    const job = store.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    const userEvidenceList: SkillEvidence[] = store.evidence.get(userId) || [];

    const matchedSkills: Array<{ skillId: string; canonicalName: string; proficiency: number }> = [];
    const missingSkills: Array<{ skillId: string; canonicalName: string; isRequired: boolean }> = [];

    let totalPoints = 0;
    let earnedPoints = 0;

    // Evaluate required skills (weight: 1.0)
    for (const skillId of job.requiredSkillIds) {
      const skill = store.skills.get(skillId);
      const name = skill ? skill.canonicalName : skillId;
      totalPoints += 100;

      const ev = userEvidenceList.find(e => e.skillId === skillId);
      if (ev && ev.proficiencyScore > 0.3) {
        const proficiency = ev.proficiencyScore;
        earnedPoints += proficiency * 100;
        matchedSkills.push({ skillId, canonicalName: name, proficiency });
      } else {
        missingSkills.push({ skillId, canonicalName: name, isRequired: true });
      }
    }

    // Evaluate preferred skills (weight: 0.5)
    for (const skillId of job.preferredSkillIds) {
      const skill = store.skills.get(skillId);
      const name = skill ? skill.canonicalName : skillId;
      totalPoints += 50;

      const ev = userEvidenceList.find(e => e.skillId === skillId);
      if (ev && ev.proficiencyScore > 0.3) {
        const proficiency = ev.proficiencyScore;
        earnedPoints += proficiency * 50;
        matchedSkills.push({ skillId, canonicalName: name, proficiency });
      } else {
        missingSkills.push({ skillId, canonicalName: name, isRequired: false });
      }
    }

    const matchScore = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;

    // Build human-readable explanation
    let explanation = '';
    const matchedNames = matchedSkills.map(m => m.canonicalName).join(', ');
    const missingReqNames = missingSkills.filter(m => m.isRequired).map(m => m.canonicalName).join(', ');

    if (matchScore >= 75) {
      explanation = `Strong match (${matchScore}%). You have demonstrated evidence in key requirements: ${matchedNames}.`;
    } else if (matchScore >= 45) {
      explanation = `Moderate match (${matchScore}%). You demonstrated competencies in ${matchedNames || 'foundational areas'}, but still have critical gaps in required technologies: ${missingReqNames}.`;
    } else {
      explanation = `Early match (${matchScore}%). Key requirements (${missingReqNames}) lack practical evidence. Recommended capstone projects will elevate this match.`;
    }

    return {
      job,
      matchScore,
      matchedSkills,
      missingSkills,
      explanation
    };
  }

  public matchAllJobs(userId: string): JobMatchResult[] {
    const results: JobMatchResult[] = [];
    for (const job of store.jobs.values()) {
      results.push(this.matchJob(userId, job.id));
    }
    return results.sort((a, b) => b.matchScore - a.matchScore);
  }
}

export const matchService = new MatchService();
