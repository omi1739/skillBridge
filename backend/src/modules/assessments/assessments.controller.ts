import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Inject,
  HttpCode,
  HttpStatus,
  UseGuards
} from '@nestjs/common';
import { AssessmentsService } from './assessments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthPayload } from '../../services/auth.service';
import { SubmitAssessmentDto } from '../../dto/assessment.dto';

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
  @UseGuards(JwtAuthGuard)
  async submitAssessment(
    @Param('id') id: string,
    @CurrentUser() user: AuthPayload | undefined,
    @Body() body: SubmitAssessmentDto
  ) {
    const candidateId = user?.userId || body.userId || 'demo_user_01';
    return this.assessmentsService.submitAssessment(id, candidateId, body.answers || []);
  }
}
