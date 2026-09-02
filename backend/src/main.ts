import 'reflect-metadata';
import * as path from 'path';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';

// Load .env file from the api workspace root (Node 22+ or fallback)
try {
  const envPath = path.resolve(__dirname, '../.env');
  (process as any).loadEnvFile?.(envPath);
} catch {
  // .env not present or running in container
}

async function bootstrap() {
  const logger = new Logger('SkillBridgeBootstrap');
  const app = await NestFactory.create(AppModule);

  // Enable CORS for frontend applications
  app.enableCors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
  });

  // Global prefix ensuring backward compatibility with /api routes
  app.setGlobalPrefix('api');

  const port = process.env.PORT || 4000;
  await app.listen(port);

  logger.log(`🚀 SkillBridge NestJS API successfully running at: http://localhost:${port}/api`);
  logger.log(`📚 Health check available at: http://localhost:${port}/api/health`);
}

bootstrap();
