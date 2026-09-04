import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  Inject,
  HttpCode,
  HttpStatus,
  UseGuards
} from '@nestjs/common';
import { AssessmentsService } from './assessments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RateLimitGuard } from '../../common/rate-limit.guard';
import { RateLimit, RateWindow } from '../../common/rate-limit.decorators';
import { AuthPayload } from '../../services/auth.service';
import {
  SubmitAssessmentDto,
  CreateAssessmentDto,
  SubmitAnswerByIdDto
} from '../../dto/assessment.dto';

@Controller('assessments')
export class AssessmentsController {
  constructor(@Inject(AssessmentsService) private readonly assessmentsService: AssessmentsService) {}

  // ---- Skill-centric assessment system ----
  @Get('skills')
  async getAssessmentSkills() {
    return this.assessmentsService.getSkillAssessmentSkills();
  }

  @Get('skills/:skillId/progress')
  @UseGuards(JwtAuthGuard)
  async getSkillProgress(
    @Param('skillId') skillId: string,
    @CurrentUser() user: AuthPayload | undefined
  ) {
    return this.assessmentsService.getSkillProgress(user?.userId || '', skillId);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  @UseGuards(RateLimitGuard)
  @RateLimit(20)
  @RateWindow(60_000)
  async createAssessment(
    @CurrentUser() user: AuthPayload | undefined,
    @Body() body: CreateAssessmentDto
  ) {
    const userId = user?.userId;
    if (!userId) {
      throw new Error('Authentication required');
    }
    return this.assessmentsService.createSkillAssessment(userId, {
      skillId: body.skillId,
      title: body.title,
      easyCount: body.easyCount ?? 2,
      mediumCount: body.mediumCount ?? 5,
      hardCount: body.hardCount ?? 3,
      totalQuestions: (body.easyCount ?? 2) + (body.mediumCount ?? 5) + (body.hardCount ?? 3)
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get('session/:id')
  async getSession(
    @Param('id') id: string,
    @CurrentUser() user: AuthPayload | undefined
  ) {
    return this.assessmentsService.getSkillAssessmentSession(user?.userId || '', id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('session/:id/answers')
  @UseGuards(RateLimitGuard)
  @RateLimit(120)
  @RateWindow(60_000)
  @HttpCode(HttpStatus.OK)
  async submitAnswer(
    @Param('id') id: string,
    @CurrentUser() user: AuthPayload | undefined,
    @Body() body: SubmitAnswerByIdDto
  ) {
    return this.assessmentsService.submitSkillAnswer(
      user?.userId || '',
      id,
      body.questionId,
      body.answer
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('session/:id/submit')
  @UseGuards(RateLimitGuard)
  @RateLimit(30)
  @RateWindow(60_000)
  @HttpCode(HttpStatus.OK)
  async submitSession(
    @Param('id') id: string,
    @CurrentUser() user: AuthPayload | undefined
  ) {
    return this.assessmentsService.submitSkillAssessment(user?.userId || '', id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('session/:id/result')
  async getResult(
    @Param('id') id: string,
    @CurrentUser() user: AuthPayload | undefined
  ) {
    return this.assessmentsService.getSkillAssessmentResult(user?.userId || '', id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('history')
  async getHistory(@CurrentUser() user: AuthPayload | undefined) {
    return this.assessmentsService.getSkillAssessmentHistory(user?.userId || '');
  }

  // ---- Legacy diagnostic ----
  @Get()
  async getAssessments() {
    return this.assessmentsService.getAssessments();
  }

  @Get('diagnostic')
  async getDiagnostic(@Query('count') count?: string) {
    const parsed = count ? Number(count) : undefined;
    return this.assessmentsService.getDiagnosticAssessment(
      parsed && !Number.isNaN(parsed) ? parsed : undefined
    );
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
