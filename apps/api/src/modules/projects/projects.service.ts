import { Injectable, BadRequestException } from '@nestjs/common';
import { projectService } from '../../services/project.service';

@Injectable()
export class ProjectsService {
  async getProjects(userId: string = 'demo_user_01') {
    return projectService.getProjects(userId);
  }

  async submitProject(
    userId: string = 'demo_user_01',
    title: string,
    repoUrl: string,
    description: string,
    primarySkills?: string[]
  ) {
    if (!title || !repoUrl) {
      throw new BadRequestException('title and repoUrl are required');
    }
    return projectService.submitProject(userId, {
      title,
      repoUrl,
      description,
      primarySkills: primarySkills || ['Node.js', 'PostgreSQL', 'REST APIs', 'Docker']
    });
  }
}
