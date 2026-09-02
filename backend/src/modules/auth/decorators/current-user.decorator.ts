import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthPayload } from '../../../services/auth.service';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): AuthPayload | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
