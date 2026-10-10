import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Inject,
  UseGuards
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { JwtAuthGuard, OptionalJwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthPayload } from '../../services/auth.service';
import { ProjectSubmissionDto } from '../../dto/project.dto';
import { demoAccessAllowed } from '../../common/demo-access';
import { RateLimitGuard } from '../../common/rate-limit.guard';
import { RateLimit, RateWindow } from '../../common/rate-limit.decorators';

@Controller()
export class ProjectsController {
  constructor(@Inject(ProjectsService) private readonly projectsService: ProjectsService) {}

  @Get('me/projects')
  @UseGuards(OptionalJwtAuthGuard)
  async getMyProjects(@CurrentUser() user: AuthPayload | undefined) {
    const userId = user?.userId || (demoAccessAllowed() ? 'demo_user_01' : undefined);
    if (!userId) {
      return [];
    }
    return this.projectsService.getProjects(userId);
  }

  @Get('me/projects/:id/health')
  @UseGuards(JwtAuthGuard, RateLimitGuard)
  @RateLimit(10)
  @RateWindow(60_000)
  async getProjectHealth(
    @CurrentUser() user: AuthPayload,
    @Param('id') id: string
  ) {
    return this.projectsService.checkProjectHealth(user.userId, id);
  }

  @Post('me/projects')
  @UseGuards(JwtAuthGuard)
  async submitProject(
    @CurrentUser() user: AuthPayload,
    @Body() body: ProjectSubmissionDto
  ) {
    return this.projectsService.submitProject(user.userId, body.title, body.repoUrl, body.description, body.primarySkills);
  }
}
