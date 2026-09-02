import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      service: 'skillbridge-api',
      framework: 'nestjs',
      version: '2.0.0',
      timestamp: new Date().toISOString()
    };
  }
}
