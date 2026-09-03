import { Controller, Get, Post, Patch, Param, Body, Inject, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AddAliasDto, UpdateRoleWeightsDto, AddQuestionDto } from '../../dto/admin.dto';

@Controller('admin')
export class AdminController {
  constructor(@Inject(AdminService) private readonly adminService: AdminService) {}

  @Get('overview')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async getOverview() {
    return this.adminService.getOverview();
  }

  @Post('skills/alias')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async addSkillAlias(@Body() body: AddAliasDto) {
    return this.adminService.addSkillAlias(body.skillId, body.alias);
  }

  @Patch('roles/:id/weights')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async updateRoleWeights(
    @Param('id') roleId: string,
    @Body() body: UpdateRoleWeightsDto
  ) {
    return this.adminService.updateRoleWeights(roleId, body.skillId, body.roleWeight, body.marketDemandFrequency);
  }

  @Post('questions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async addQuestion(@Body() body: AddQuestionDto) {
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
