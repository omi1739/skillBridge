import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Inject,
  UseGuards
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { JwtAuthGuard, OptionalJwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthPayload } from '../../services/auth.service';

@Controller()
export class ProjectsController {
  constructor(@Inject(ProjectsService) private readonly projectsService: ProjectsService) {}

  @Get('me/projects')
  @UseGuards(OptionalJwtAuthGuard)
  async getMyProjects(@CurrentUser() user: AuthPayload | undefined, @Query('userId') queryUserId?: string) {
    const userId = user?.userId || queryUserId || 'demo_user_01';
    return this.projectsService.getProjects(userId);
  }

  @Post('me/projects')
  @UseGuards(JwtAuthGuard)
  async submitProject(
    @CurrentUser() user: AuthPayload | undefined,
    @Body() body: { userId?: string; title: string; repoUrl: string; description: string; primarySkills?: string[] }
  ) {
    const userId = user?.userId || body.userId || 'demo_user_01';
    return this.projectsService.submitProject(userId, body.title, body.repoUrl, body.description, body.primarySkills);
  }
}
