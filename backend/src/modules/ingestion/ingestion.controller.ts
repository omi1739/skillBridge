import { Controller, Get, Post, Query, Body, UseGuards, InternalServerErrorException } from '@nestjs/common';
import { IngestionService } from './ingestion.service';
import { store } from '../../store';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller()
export class IngestionController {
  constructor(private readonly ingestionService: IngestionService) {}

  @Get('market/demand')
  async getMarketDemand(@Query('roleId') roleId?: string) {
    return this.ingestionService.getMarketDemand(roleId);
  }

  @Get('ingest/sources')
  async getSources() {
    return store.getJobSources();
  }

  @Post('ingest/run')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async runIngestion(
    @Body() body: { sourceUrl?: string; minMatches?: number; replace?: boolean } = {}
  ) {
    try {
      return await this.ingestionService.ingest({
        sourceUrl: body.sourceUrl,
        minMatches: body.minMatches,
        replace: body.replace
      });
    } catch (err: any) {
      // Surface the underlying reason for diagnosis during rollout. The
      // response body is only truthful for ADMIN callers (guard above).
      throw new InternalServerErrorException(err?.message || String(err));
    }
  }
}
