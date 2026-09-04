import { SetMetadata } from '@nestjs/common';
import { RATE_LIMIT_KEY, RATE_WINDOW_KEY } from './rate-limit.guard';

export const RateLimit = (limit: number) => SetMetadata(RATE_LIMIT_KEY, limit);
export const RateWindow = (windowMs: number) => SetMetadata(RATE_WINDOW_KEY, windowMs);
