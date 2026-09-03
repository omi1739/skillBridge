import { Controller, Get, Post, Patch, Delete, Param, Body, Inject, UseGuards, Query } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthPayload } from '../../services/auth.service';
import { AddAliasDto, UpdateRoleWeightsDto, AddQuestionDto, AddJobSourceDto, UpdateJobSourceDto, UpdateUserRoleDto } from '../../dto/admin.dto';

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

  // --- User Management ---

  @Get('users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async getUsers(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string
  ) {
    return this.adminService.getUsers({
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      search
    });
  }

  @Get('dashboard')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async getDashboard() {
    return this.adminService.getDashboard();
  }

  @Patch('users/:id/role')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async updateUserRole(
    @CurrentUser() currentUser: AuthPayload,
    @Param('id') userId: string,
    @Body() body: UpdateUserRoleDto
  ) {
    return this.adminService.updateUserRole(userId, body.role, currentUser);
  }

  @Delete('users/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async deleteUser(
    @CurrentUser() currentUser: AuthPayload,
    @Param('id') userId: string
  ) {
    return this.adminService.deleteUser(userId, currentUser);
  }
}
