import { Injectable, NotFoundException } from '@nestjs/common';
import { store } from '../../store';

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
}
