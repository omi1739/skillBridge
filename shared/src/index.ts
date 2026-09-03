// SkillBridge Shared Domain Types

export type UserRole = 'USER' | 'ADMIN' | 'RECRUITER';

export type CurrentStatus = 'STUDENT' | 'JOB_HOLDER' | 'JOB_SEEKER' | 'OTHER';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  currentStatus?: CurrentStatus;
  googleId?: string;
  provider?: 'EMAIL' | 'GOOGLE';
  createdAt: string;
}

export interface Profile {
  id: string;
  userId: string;
  fullName: string;
  targetRoleId?: string;
  githubUrl?: string;
  portfolioUrl?: string;
  bio?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Skill {
  id: string;
  canonicalName: string;
  category: string;
  description: string;
  aliases: string[];
  prerequisites: string[];
}

export interface RoleSkill {
  skillId: string;
  required: boolean;
  roleWeight: number; // 0.00 to 1.00
  marketDemandFrequency: number; // 0.00 to 1.00
  proficiencyTarget: 'Beginner' | 'Intermediate' | 'Advanced';
  skill?: Skill;
}

export interface Role {
  id: string;
  slug: string;
  title: string;
  category: string;
  description: string;
  marketContext: {
    region: string;
    experienceLevel: string;
    typicalTitles: string[];
  };
  roleSkills: RoleSkill[];
}

export type QuestionType = 'MCQ' | 'OUTPUT_PREDICTION' | 'CODE_DEBUG' | 'SQL_QUERY';

export interface Question {
  id: string;
  assessmentId: string;
  prompt: string;
  codeSnippet?: string;
  questionType: QuestionType;
  options?: string[];
  correctAnswer: string;
  explanation: string;
  subSkill: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  points: number;
}

export interface Assessment {
  id: string;
  skillId?: string;
  title: string;
  description: string;
  timeLimitMinutes: number;
  passingScore: number;
  version: string;
  questions?: Question[];
}

export interface AssessmentSubmissionAnswer {
  questionId: string;
  selectedAnswer: string;
}

export interface SubSkillResult {
  subSkill: string;
  earnedPoints: number;
  totalPoints: number;
  percentage: number;
  status: 'STRENGTH' | 'MODERATE' | 'NEEDS_WORK';
}

export interface AssessmentAttempt {
  id: string;
  userId: string;
  assessmentId: string;
  startedAt: string;
  completedAt?: string;
  score: number; // 0 to 100%
  totalPointsEarned: number;
  maxPoints: number;
  passed: boolean;
  subSkillScores: SubSkillResult[];
  status: 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';
}

export type EvidenceSourceType = 'SELF_REPORTED' | 'ASSESSMENT' | 'PROJECT' | 'GITHUB';
export type ConfidenceLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface SkillEvidence {
  id: string;
  userId: string;
  skillId: string;
  sourceType: EvidenceSourceType;
  sourceId?: string;
  proficiencyScore: number; // 0.00 to 1.00
  confidence: ConfidenceLevel;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface SkillGap {
  id: string;
  userId: string;
  roleId: string;
  skillId: string;
  skillName: string;
  roleWeight: number;
  marketDemand: number;
  demonstratedProficiency: number;
  priorityScore: number; // roleWeight * marketDemand * (1 - demonstratedProficiency)
  explanation: string;
  status: 'MAINTAIN' | 'MINOR_GAP' | 'MAJOR_GAP';
}

export interface ActionRecommendation {
  id: string;
  userId: string;
  type: 'CAPSTONE_PROJECT' | 'PRACTICAL_TASK' | 'REASSESSMENT';
  title: string;
  description: string;
  targetSkillIds: string[];
  targetSkillNames: string[];
  estimatedHours: number;
  priorityLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
}

export interface ProjectEvidence {
  id: string;
  userId: string;
  title: string;
  repoUrl: string;
  description: string;
  primarySkills: string[];
  detectedStack: string[];
  hasTests: boolean;
  hasDocker: boolean;
  hasReadme: boolean;
  commitCountEstimate: number;
  verificationStatus: 'PENDING' | 'VERIFIED' | 'NEEDS_REVIEW';
  submittedAt: string;
}

export interface CurriculumCoverageArea {
  skillId: string;
  canonicalName: string;
  academicEmphasis: 'HIGH' | 'MODERATE' | 'THEORY_ONLY' | 'NOT_COVERED';
  practicalHoursEstimate: number;
  syllabusTopics: string[];
}

export interface CurriculumProfile {
  id: string;
  institutionName: string;
  type: 'UNIVERSITY_DEGREE' | 'BOOTCAMP';
  coverageAreas: CurriculumCoverageArea[];
}

export interface CurriculumComparisonResult {
  institution: string;
  targetRole: string;
  marketAlignmentScore: number; // 0 to 100%
  strongAcademicAreas: Array<{ skill: string; reason: string }>;
  criticalMarketOmissions: Array<{
    skill: string;
    marketDemand: number;
    academicStatus: string;
    recommendation: string;
  }>;
  summaryAnalysis: string;
}

export interface JobListing {
  id: string;
  title: string;
  company: string;
  location: string;
  experienceLevel: string;
  roleId: string;
  description: string;
  requiredSkillIds: string[];
  preferredSkillIds: string[];
  postedAt: string;
}

export interface JobMatchResult {
  job: JobListing;
  matchScore: number; // 0 to 100%
  matchedSkills: Array<{ skillId: string; canonicalName: string; proficiency: number }>;
  missingSkills: Array<{ skillId: string; canonicalName: string; isRequired: boolean }>;
  explanation: string;
}
