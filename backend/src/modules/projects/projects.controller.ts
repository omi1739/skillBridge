import { Controller, Get, Post, Body, Query, Inject } from '@nestjs/common';
import { ProjectsService } from './projects.service';

@Controller()
export class ProjectsController {
  constructor(@Inject(ProjectsService) private readonly projectsService: ProjectsService) {}

  @Get('me/projects')
  async getMyProjects(@Query('userId') queryUserId?: string) {
    const userId = queryUserId || 'demo_user_01';
    return this.projectsService.getProjects(userId);
  }

  @Post('me/projects')
  async submitProject(
    @Body() body: { userId?: string; title: string; repoUrl: string; description: string; primarySkills?: string[] }
  ) {
    const userId = body.userId || 'demo_user_01';
    return this.projectsService.submitProject(userId, body.title, body.repoUrl, body.description, body.primarySkills);
  }
}
