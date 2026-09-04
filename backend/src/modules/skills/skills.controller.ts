import { Controller, Get, Param, Inject } from '@nestjs/common';
import { SkillsService } from './skills.service';

@Controller('skills')
export class SkillsController {
  constructor(@Inject(SkillsService) private readonly skillsService: SkillsService) {}

  @Get()
  async getSkills() {
    return this.skillsService.getSkills();
  }

  @Get(':id')
  async getSkillById(@Param('id') id: string) {
    return this.skillsService.getSkillById(id);
  }

  @Get(':skillId/topics')
  async getSkillTopics(@Param('skillId') skillId: string) {
    return this.skillsService.getSkillTopics(skillId);
  }
}
