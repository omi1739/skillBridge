import { Injectable } from '@nestjs/common';
import { curriculumService } from '../../services/curriculum.service';

@Injectable()
export class NestCurriculumService {
  getCurricula() {
    return curriculumService.getCurricula();
  }

  async analyzeCurriculum(institutionId: string = 'curr_bsc_cse', roleId: string = 'role_junior_backend') {
    return curriculumService.analyzeCurriculum(institutionId, roleId);
  }
}
