import { Controller, Get } from '@nestjs/common';
import { testConnection } from './db/client';

@Controller()
export class AppController {
  @Get('health')
  async getHealth() {
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
