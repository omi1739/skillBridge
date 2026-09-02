import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { SkillsModule } from './modules/skills/skills.module';
import { RolesModule } from './modules/roles/roles.module';
import { AssessmentsModule } from './modules/assessments/assessments.module';
import { SandboxModule } from './modules/sandbox/sandbox.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { CurriculumModule } from './modules/curriculum/curriculum.module';
import { AdminModule } from './modules/admin/admin.module';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    SkillsModule,
    RolesModule,
    AssessmentsModule,
    SandboxModule,
    ProjectsModule,
    JobsModule,
    CurriculumModule,
    AdminModule
  ],
  controllers: [AppController]
})
export class AppModule {}
