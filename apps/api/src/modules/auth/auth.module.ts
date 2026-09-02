import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { NestAuthService } from './auth.service';
import { JwtAuthGuard, OptionalJwtAuthGuard } from './guards/jwt-auth.guard';

@Module({
  controllers: [AuthController],
  providers: [NestAuthService, JwtAuthGuard, OptionalJwtAuthGuard],
  exports: [NestAuthService, JwtAuthGuard, OptionalJwtAuthGuard]
})
export class AuthModule {}
