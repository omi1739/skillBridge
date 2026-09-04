import { QuestionDifficulty, SkillLevel, TopicResult } from '@skillbridge/types';

/**
 * Centralized, configurable scoring for skill assessments.
 *
 * Kept in its own service so the weighting scheme and skill-level thresholds
 * can change without touching the rest of the assessment flow.
 *
 * Difficulty weights (easy/medium/hard):
 *   easy = 1, medium = 2, hard = 3
 *
 * Skill level (0-100):
 *   0-39  Beginner
 *   40-69 Developing
 *   70-84 Intermediate
 *   85-100 Advanced
 */

export const DIFFICULTY_WEIGHTS: Record<QuestionDifficulty, number> = {
  easy: 1,
  medium: 2,
  hard: 3
};

export const SKILL_LEVEL_THRESHOLDS = [
  { min: 85, level: 'Advanced' as SkillLevel },
  { min: 70, level: 'Intermediate' as SkillLevel },
  { min: 40, level: 'Developing' as SkillLevel },
  { min: 0, level: 'Beginner' as SkillLevel }
];

export function difficultyWeight(difficulty: QuestionDifficulty): number {
  return DIFFICULTY_WEIGHTS[difficulty] ?? 2;
}

export function skillLevelForScore(score: number): SkillLevel {
  const entry = SKILL_LEVEL_THRESHOLDS.find(t => score >= t.min);
  return entry ? entry.level : 'Beginner';
}

export class ScoringService {
  /**
   * Weighted score: sum of earned weighted points / sum of max weighted points.
   * Returns an integer 0-100 rounded.
   */
  calculateScore(earnedWeighted: number, maxWeighted: number): number {
    if (maxWeighted <= 0) return 0;
    return Math.round((earnedWeighted / maxWeighted) * 100);
  }

  /**
   * Aggregate per-topic performance from individual question results.
   * A topic is a STRENGTH at >= 80%, MODERATE at >= 50%, else NEEDS_WORK.
   */
  topicResults(
    byTopic: Record<string, { earned: number; total: number }>
  ): TopicResult[] {
    return Object.entries(byTopic)
      .map(([topic, d]) => {
        const pct = d.total > 0 ? Math.round((d.earned / d.total) * 100) : 0;
        const status: TopicResult['status'] =
          pct >= 80 ? 'STRENGTH' : pct >= 50 ? 'MODERATE' : 'NEEDS_WORK';
        return { topic, earnedPoints: d.earned, totalPoints: d.total, percentage: pct, status };
      })
      .sort((a, b) => b.percentage - a.percentage);
  }

  strengths(results: TopicResult[]): string[] {
    return results.filter(r => r.status === 'STRENGTH').map(r => r.topic);
  }

  needsImprovement(results: TopicResult[]): string[] {
    return results
      .filter(r => r.status === 'NEEDS_WORK')
      .map(r => r.topic);
  }
}

export const scoringService = new ScoringService();
