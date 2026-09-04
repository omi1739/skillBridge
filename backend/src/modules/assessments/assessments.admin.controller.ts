import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RateLimitGuard } from '../../common/rate-limit.guard';
import { RateLimit, RateWindow } from '../../common/rate-limit.decorators';
import { GenerateQuestionsDto, UpdateQuestionStatusDto } from '../../dto/assessment.dto';
import {
  createSkillTopic,
  getSkillTopicsForSkill,
  updateQuestionStatus,
  listAdminBankQuestions
} from '../../services/assessment/admin.service';
import { questionGenerationService } from '../../services/ai/question-generation.service';

/**
 * Admin + topic-management routes for the skill assessment system.
 * Path `/assessments/admin/*` is intentionally distinct from the candidate
 * session routes so `@Get(':id')` in the main controller never shadows these.
 */
@Controller('assessments/admin')
export class AssessmentsAdminController {
  @Get('questions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async listQuestions(@Query('status') status?: string) {
    return listAdminBankQuestions(status);
  }

  @Patch('questions/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  async updateStatus(
    @Param('id') id: string,
    @Body() body: UpdateQuestionStatusDto
  ) {
    await updateQuestionStatus(id, body.status);
    return { success: true };
  }

  @Post('generate')
  @UseGuards(JwtAuthGuard, RolesGuard, RateLimitGuard)
  @Roles('ADMIN')
  @RateLimit(5)
  @RateWindow(60_000)
  async generate(@Body() body: GenerateQuestionsDto) {
    return questionGenerationService.generate({
      skillId: body.skillId,
      topic: body.topic,
      difficulty: body.difficulty,
      questionType: body.questionType as 'MCQ' | 'multiple_select' | 'true_false' | 'code_output',
      count: body.count
    });
  }

  @Get('topics/:skillId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async topics(@Param('skillId') skillId: string) {
    return getSkillTopicsForSkill(skillId);
  }

  @Post('topics/:skillId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async addTopic(
    @Param('skillId') skillId: string,
    @Body() body: { name: string; description?: string }
  ) {
    await createSkillTopic(skillId, body.name, body.description);
    return { success: true };
  }
}
