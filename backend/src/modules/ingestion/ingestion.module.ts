import { Module } from '@nestjs/common';
import { IngestionController } from './ingestion.controller';
import { IngestionService } from './ingestion.service';
import { CacheService } from '../../common/cache.service';

@Module({
  controllers: [IngestionController],
  providers: [IngestionService, CacheService],
  exports: [IngestionService]
})
export class IngestionModule {}
