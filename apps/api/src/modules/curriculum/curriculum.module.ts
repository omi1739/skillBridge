import { Module } from '@nestjs/common';
import { CurriculumController } from './curriculum.controller';
import { NestCurriculumService } from './curriculum.service';

@Module({
  controllers: [CurriculumController],
  providers: [NestCurriculumService],
  exports: [NestCurriculumService]
})
export class CurriculumModule {}
