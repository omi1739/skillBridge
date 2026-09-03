import { Controller, Get, Inject } from '@nestjs/common';
import { StatsService } from './stats.service';

@Controller('stats')
export class StatsController {
  constructor(@Inject(StatsService) private readonly statsService: StatsService) {}

  @Get()
  async getLandingStats() {
    return this.statsService.getLandingStats();
  }
}
