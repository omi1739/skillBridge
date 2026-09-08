import { Controller, Get, Param, Query, Inject, UseGuards } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthPayload } from '../../services/auth.service';

@Controller('jobs')
@UseGuards(JwtAuthGuard)
export class JobsController {
  constructor(@Inject(JobsService) private readonly jobsService: JobsService) {}

  @Get()
  async getJobs(@Query('sort') sort?: string) {
    return this.jobsService.getJobs(sort === 'recent' ? 'recent' : 'priority');
  }

  @Get('matches')
  async getMatches(@CurrentUser() user: AuthPayload, @Query('roleId') roleId?: string) {
    return this.jobsService.getMatches(user.userId, roleId);
  }

  @Get(':id/match')
  async getJobMatch(@CurrentUser() user: AuthPayload, @Param('id') id: string) {
    return this.jobsService.matchJob(user.userId, id);
  }
}
