import { CurriculumProfile, CurriculumComparisonResult, Role } from '@skillbridge/types';
import { store } from '../store';

export class CurriculumService {
  private curricula: CurriculumProfile[] = [];

  public getCurricula(): CurriculumProfile[] {
    return this.curricula;
  }

  public async analyzeCurriculum(curriculumId: string, roleId: string = 'role_full_stack'): Promise<CurriculumComparisonResult> {
    const curriculum = this.curricula.find(c => c.id === curriculumId) || this.curricula[0];
    const role: Role | undefined = await store.getRole(roleId);

    const strongAcademicAreas: Array<{ skill: string; reason: string }> = [];
    const criticalMarketOmissions: Array<{
      skill: string;
      marketDemand: number;
      academicStatus: string;
      recommendation: string;
    }> = [];

    if (!curriculum || !role || !role.roleSkills || role.roleSkills.length === 0) {
      return {
        institution: curriculum?.institutionName || 'No curriculum loaded',
        targetRole: role?.title || roleId,
        marketAlignmentScore: 0,
        strongAcademicAreas,
        criticalMarketOmissions,
        summaryAnalysis: curriculum
          ? 'Curriculum and role prerequisites are still being prepared.'
          : 'No curriculum data is loaded yet. Once a syllabus is ingested, this analysis will benchmark it against live market demand.'
      };
    }
    const availableRole = role;
    const availableCurriculum = curriculum;

    let totalWeight = 0;
    let alignedWeight = 0;

    for (const rs of availableRole.roleSkills) {
      const skillName = rs.skill?.canonicalName || rs.skillId;
      const coverage = availableCurriculum.coverageAreas.find(c => c.skillId === rs.skillId);
      totalWeight += rs.roleWeight * rs.marketDemandFrequency;

      if (coverage) {
        if (coverage.academicEmphasis === 'HIGH') {
          alignedWeight += rs.roleWeight * rs.marketDemandFrequency * 1.0;
          strongAcademicAreas.push({
            skill: skillName,
            reason: `Heavily emphasized in syllabus (${coverage.practicalHoursEstimate} hrs). Topics: ${coverage.syllabusTopics.slice(0, 3).join(', ')}.`
          });
        } else if (coverage.academicEmphasis === 'MODERATE') {
          alignedWeight += rs.roleWeight * rs.marketDemandFrequency * 0.6;
        } else if (coverage.academicEmphasis === 'THEORY_ONLY') {
          alignedWeight += rs.roleWeight * rs.marketDemandFrequency * 0.3;
          if (rs.marketDemandFrequency >= 0.70) {
            criticalMarketOmissions.push({
              skill: skillName,
              marketDemand: Math.round(rs.marketDemandFrequency * 100),
              academicStatus: 'Theory Only (Minimal Practical Implementation)',
              recommendation: `Transition from conceptual theory to real implementation projects (e.g. index optimization, raw query testing).`
            });
          }
        } else if (coverage.academicEmphasis === 'NOT_COVERED') {
          if (rs.marketDemandFrequency >= 0.50) {
            criticalMarketOmissions.push({
              skill: skillName,
              marketDemand: Math.round(rs.marketDemandFrequency * 100),
              academicStatus: 'Not Included in Syllabus',
              recommendation: `High industry demand (${Math.round(rs.marketDemandFrequency * 100)}%). Must be acquired via practical capstone projects and independent diagnostic testing.`
            });
          }
        }
      } else {
        if (rs.marketDemandFrequency >= 0.50) {
          criticalMarketOmissions.push({
            skill: skillName,
            marketDemand: Math.round(rs.marketDemandFrequency * 100),
            academicStatus: 'Absent from Curriculum',
            recommendation: `Demanded by ${Math.round(rs.marketDemandFrequency * 100)}% of hiring companies. Complete dedicated sandbox tasks.`
          });
        }
      }
    }

    const alignmentScore = totalWeight > 0 ? Math.round((alignedWeight / totalWeight) * 100) : 50;

    let summaryAnalysis = '';
    if (availableCurriculum.type === 'UNIVERSITY_DEGREE') {
      summaryAnalysis = `The B.Sc. CSE syllabus builds formidable foundations in database theory, algorithmic problem solving, and software engineering principles. However, modern industry backend requirements (Node.js runtime, Docker containerization, REST API contracts, and Git workflows) have a ${100 - alignmentScore}% practical gap that students must bridge through hands-on capstones.`;
    } else {
      summaryAnalysis = `The Bootcamp curriculum strongly emphasizes practical web technologies (JavaScript, Node.js, REST APIs) with a high initial alignment (${alignmentScore}%). To advance, candidates should deepen database optimization (indexing, transactions) and containerization.`;
    }

    return {
      institution: availableCurriculum.institutionName,
      targetRole: availableRole.title,
      marketAlignmentScore: alignmentScore,
      strongAcademicAreas,
      criticalMarketOmissions,
      summaryAnalysis
    };
  }
}

export const curriculumService = new CurriculumService();
