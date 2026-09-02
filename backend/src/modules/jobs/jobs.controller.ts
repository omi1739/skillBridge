import { Controller, Get, Query, Inject } from '@nestjs/common';
import { JobsService } from './jobs.service';

@Controller('jobs')
export class JobsController {
  constructor(@Inject(JobsService) private readonly jobsService: JobsService) {}

  @Get()
  async getJobs() {
    return this.jobsService.getJobs();
  }

  @Get('matches')
  async getMatches(@Query('userId') queryUserId?: string) {
    const userId = queryUserId || 'demo_user_01';
    return this.jobsService.getMatches(userId);
  }
}
