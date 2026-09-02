import { JobListing, JobMatchResult, SkillEvidence } from '@skillbridge/types';
import { store } from '../store';

export class MatchService {
  /**
   * Evaluates job compatibility based on demonstrated candidate evidence.
   */
  public async matchJob(userId: string, jobId: string): Promise<JobMatchResult> {
    const jobs = await store.getJobs();
    const job = jobs.find(j => j.id === jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    const allSkills = await store.getSkills();
    const skillName = (id: string) => allSkills.find(s => s.id === id)?.canonicalName || id;

    const userEvidenceList: SkillEvidence[] = await store.getEvidence(userId);

    const matchedSkills: Array<{ skillId: string; canonicalName: string; proficiency: number }> = [];
    const missingSkills: Array<{ skillId: string; canonicalName: string; isRequired: boolean }> = [];

    let totalPoints = 0;
    let earnedPoints = 0;

    // Evaluate required skills (weight: 1.0)
    for (const skillId of job.requiredSkillIds) {
      totalPoints += 100;
      const ev = userEvidenceList.find(e => e.skillId === skillId);
      if (ev && ev.proficiencyScore > 0.3) {
        earnedPoints += ev.proficiencyScore * 100;
        matchedSkills.push({ skillId, canonicalName: skillName(skillId), proficiency: ev.proficiencyScore });
      } else {
        missingSkills.push({ skillId, canonicalName: skillName(skillId), isRequired: true });
      }
    }

    // Evaluate preferred skills (weight: 0.5)
    for (const skillId of job.preferredSkillIds) {
      totalPoints += 50;
      const ev = userEvidenceList.find(e => e.skillId === skillId);
      if (ev && ev.proficiencyScore > 0.3) {
        earnedPoints += ev.proficiencyScore * 50;
        matchedSkills.push({ skillId, canonicalName: skillName(skillId), proficiency: ev.proficiencyScore });
      } else {
        missingSkills.push({ skillId, canonicalName: skillName(skillId), isRequired: false });
      }
    }

    const matchScore = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;

    const matchedNames = matchedSkills.map(m => m.canonicalName).join(', ');
    const missingReqNames = missingSkills.filter(m => m.isRequired).map(m => m.canonicalName).join(', ');

    let explanation = '';
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

  public async matchAllJobs(userId: string): Promise<JobMatchResult[]> {
    const jobs = await store.getJobs();
    const results: JobMatchResult[] = [];
    for (const job of jobs) {
      results.push(await this.matchJob(userId, job.id));
    }
    return results.sort((a, b) => b.matchScore - a.matchScore);
  }
}

export const matchService = new MatchService();
