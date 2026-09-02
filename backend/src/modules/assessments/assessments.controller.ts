import { Controller, Get, Post, Param, Body, Inject, HttpCode, HttpStatus } from '@nestjs/common';
import { AssessmentsService } from './assessments.service';

@Controller('assessments')
export class AssessmentsController {
  constructor(@Inject(AssessmentsService) private readonly assessmentsService: AssessmentsService) {}

  @Get()
  async getAssessments() {
    return this.assessmentsService.getAssessments();
  }

  @Get(':id')
  async getAssessmentById(@Param('id') id: string) {
    return this.assessmentsService.getAssessmentById(id);
  }

  @Post(':id/submit')
  @HttpCode(HttpStatus.OK)
  async submitAssessment(
    @Param('id') id: string,
    @Body() body: { userId?: string; answers?: Array<{ questionId: string; selectedAnswer: string }> }
  ) {
    return this.assessmentsService.submitAssessment(id, body.userId || 'demo_user_01', body.answers || []);
  }
}
