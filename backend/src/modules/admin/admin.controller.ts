import { Controller, Get, Post, Patch, Param, Body, Inject } from '@nestjs/common';
import { AdminService } from './admin.service';

@Controller('admin')
export class AdminController {
  constructor(@Inject(AdminService) private readonly adminService: AdminService) {}

  @Get('overview')
  async getOverview() {
    return this.adminService.getOverview();
  }

  @Post('skills/alias')
  async addSkillAlias(@Body() body: { skillId: string; alias: string }) {
    return this.adminService.addSkillAlias(body.skillId, body.alias);
  }

  @Patch('roles/:id/weights')
  async updateRoleWeights(
    @Param('id') roleId: string,
    @Body() body: { skillId: string; roleWeight?: number; marketDemandFrequency?: number }
  ) {
    return this.adminService.updateRoleWeights(roleId, body.skillId, body.roleWeight, body.marketDemandFrequency);
  }

  @Post('questions')
  async addQuestion(
    @Body() body: {
      assessmentId?: string;
      prompt: string;
      correctAnswer: string;
      subSkill: string;
      codeSnippet?: string;
      questionType?: string;
      options?: string[];
      explanation?: string;
      points?: number;
    }
  ) {
    return this.adminService.addQuestion(
      body.assessmentId,
      body.prompt,
      body.correctAnswer,
      body.subSkill,
      body.codeSnippet,
      body.questionType,
      body.options,
      body.explanation,
      body.points
    );
  }
}
