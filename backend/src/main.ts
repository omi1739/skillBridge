import 'reflect-metadata';
import * as path from 'path';
import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
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

  // Enable CORS for the frontend. In development reflect any origin (true); in
  // production restrict to the frontend origin(s) via the CORS_ORIGIN env var
  // (comma-separated), e.g. CORS_ORIGIN=https://skillbridge.vercel.app
  const corsOrigin = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(o => o.trim()).filter(Boolean)
    : true;
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
  });

  // Global prefix ensuring backward compatibility with /api routes
  app.setGlobalPrefix('api');

  // Declarative request validation via DTOs. Whitelist strips unknown body
  // properties; production additionally rejects unknown properties outright.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: process.env.NODE_ENV === 'production',
      transform: true
    })
  );

  const port = process.env.PORT || 4000;
  await app.listen(port);

  logger.log(`🚀 SkillBridge NestJS API successfully running at: http://localhost:${port}/api`);
  logger.log(`📚 Health check available at: http://localhost:${port}/api/health`);
}

bootstrap();
