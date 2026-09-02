import { Injectable, NotFoundException } from '@nestjs/common';
import { store } from '../../store';

@Injectable()
export class RolesService {
  async getRoles() {
    return store.getRoles();
  }

  async getRoleById(id: string) {
    const role = await store.getRole(id);
    if (!role) {
      throw new NotFoundException(`Role with id ${id} not found`);
    }
    return role;
  }
}
