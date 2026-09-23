import { Controller, Get } from '@nestjs/common';
import { testConnection } from './db/client';

@Controller()
export class AppController {
  @Get('health')
  getHealth() {
    // Deliberately DB-free: Render polls this endpoint continuously, and a DB
    // probe on every ping keeps the Neon compute awake 24/7, exhausting the
    // free-tier compute-hour quota purely from monitoring. Use /api/health/db
    // for an explicit database probe instead.
    return {
      status: 'ok',
      service: 'skillbridge-api',
      framework: 'nestjs',
      version: '2.0.0',
      timestamp: new Date().toISOString()
    };
  }

  @Get('health/db')
  async getDbHealth() {
    let dbOk = false;
    let dbStatus = 'unreachable';
    try {
      dbOk = await testConnection();
    } catch {
      dbOk = false;
    }
    if (dbOk) {
      dbStatus = 'connected';
    }
    return {
      status: dbOk ? 'ok' : 'error',
      service: 'skillbridge-api',
      framework: 'nestjs',
      version: '2.0.0',
      database: dbStatus,
      timestamp: new Date().toISOString()
    };
  }
}
