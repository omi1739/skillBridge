import { Module } from '@nestjs/common';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { RateLimitGuard } from '../../common/rate-limit.guard';

@Module({
  controllers: [ProjectsController],
  providers: [ProjectsService, RateLimitGuard],
  exports: [ProjectsService]
})
export class ProjectsModule {}
