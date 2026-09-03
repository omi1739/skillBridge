import { Module } from '@nestjs/common';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';
import { CacheService } from '../../common/cache.service';

@Module({
  controllers: [StatsController],
  providers: [StatsService, CacheService],
  exports: [StatsService]
})
export class StatsModule {}
