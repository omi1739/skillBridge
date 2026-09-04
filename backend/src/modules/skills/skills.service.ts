import { Injectable, NotFoundException } from '@nestjs/common';
import { store } from '../../store';
import { getSkillTopics } from '../../store/assessment.store';

@Injectable()
export class SkillsService {
  async getSkills() {
    return store.getSkills();
  }

  async getSkillById(id: string) {
    const skill = await store.getSkill(id);
    if (!skill) {
      throw new NotFoundException(`Skill with id ${id} not found`);
    }
    return skill;
  }

  async getSkillTopics(skillId: string) {
    const skill = await store.getSkill(skillId);
    if (!skill) {
      throw new NotFoundException(`Skill with id ${skillId} not found`);
    }
    return getSkillTopics(skillId);
  }
}
