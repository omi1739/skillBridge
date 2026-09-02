import { Controller, Get, Param, Inject } from '@nestjs/common';
import { RolesService } from './roles.service';

@Controller('roles')
export class RolesController {
  constructor(@Inject(RolesService) private readonly rolesService: RolesService) {}

  @Get()
  async getRoles() {
    return this.rolesService.getRoles();
  }

  @Get(':id')
  async getRoleById(@Param('id') id: string) {
    return this.rolesService.getRoleById(id);
  }
}
