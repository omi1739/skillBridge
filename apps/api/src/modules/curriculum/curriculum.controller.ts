import { Controller, Get, Query, Inject } from '@nestjs/common';
import { NestCurriculumService } from './curriculum.service';

@Controller('curriculum')
export class CurriculumController {
  constructor(@Inject(NestCurriculumService) private readonly curriculumService: NestCurriculumService) {}

  @Get('institutions')
  getInstitutions() {
    return this.curriculumService.getCurricula();
  }

  @Get('analyze')
  async analyze(
    @Query('institutionId') institutionId?: string,
    @Query('roleId') roleId?: string
  ) {
    return this.curriculumService.analyzeCurriculum(
      institutionId || 'curr_bsc_cse',
      roleId || 'role_junior_backend'
    );
  }
}
