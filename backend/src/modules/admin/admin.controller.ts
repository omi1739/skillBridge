import { Controller, Get, Post, Patch, Delete, Param, Body, Inject, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AddAliasDto, UpdateRoleWeightsDto, AddQuestionDto, AddJobSourceDto, UpdateJobSourceDto } from '../../dto/admin.dto';

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

  // --- Source Management ---

  @Get('sources')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async getSources() {
    return this.adminService.getSources();
  }

  @Post('sources')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async addSource(@Body() body: AddJobSourceDto) {
    return this.adminService.addSource(body);
  }

  @Patch('sources/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async updateSource(
    @Param('id') sourceId: string,
    @Body() body: UpdateJobSourceDto
  ) {
    return this.adminService.updateSource(sourceId, body);
  }

  @Delete('sources/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async deleteSource(@Param('id') sourceId: string) {
    return this.adminService.deleteSource(sourceId);
  }

  // --- Job Removal ---

  @Delete('jobs/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async deleteJob(@Param('id') jobId: string) {
    return this.adminService.deleteJob(jobId);
  }

  // --- Verification ---

  @Post('verification/sweep')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async runVerificationSweep() {
    return this.adminService.runVerificationSweep();
  }

  @Get('verification/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async getVerificationStatus() {
    return this.adminService.getVerificationStatus();
  }
}
