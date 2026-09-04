import { BankQuestion } from '@skillbridge/types';
import {
  getSkillTopics as getSkillTopicsStore,
  addSkillTopic,
  setQuestionVerificationStatus,
  listAdminBankQuestions as listAdminQuestionsStore
} from '../../store/assessment.store';

export async function getSkillTopicsForSkill(skillId: string) {
  return getSkillTopicsStore(skillId);
}

export async function createSkillTopic(skillId: string, name: string, description?: string) {
  await addSkillTopic(skillId, name, description);
}

export async function updateQuestionStatus(questionId: string, status: string) {
  await setQuestionVerificationStatus(questionId, status);
}

export async function listAdminBankQuestions(
  status?: string
): Promise<(BankQuestion & { skillName?: string })[]> {
  return listAdminQuestionsStore(status);
}
