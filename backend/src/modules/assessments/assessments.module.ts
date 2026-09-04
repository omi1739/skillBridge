import { Module } from '@nestjs/common';
import { AssessmentsController } from './assessments.controller';
import { AssessmentsService } from './assessments.service';
import { AssessmentsAdminController } from './assessments.admin.controller';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RateLimitGuard } from '../../common/rate-limit.guard';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [AssessmentsController, AssessmentsAdminController],
  providers: [AssessmentsService, JwtAuthGuard, RolesGuard, RateLimitGuard],
  exports: [AssessmentsService]
})
export class AssessmentsModule {}
