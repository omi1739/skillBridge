import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
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
import { StatsModule } from './modules/stats/stats.module';
import { IngestionModule } from './modules/ingestion/ingestion.module';
import { RequestLoggingMiddleware } from './common/request-logging.middleware';

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
    AdminModule,
    StatsModule,
    IngestionModule
  ],
  controllers: [AppController]
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggingMiddleware).forRoutes('*');
  }
}
