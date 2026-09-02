import { Module } from '@nestjs/common';
import { SandboxController } from './sandbox.controller';
import { NestSandboxService } from './sandbox.service';

@Module({
  controllers: [SandboxController],
  providers: [NestSandboxService],
  exports: [NestSandboxService]
})
export class SandboxModule {}
