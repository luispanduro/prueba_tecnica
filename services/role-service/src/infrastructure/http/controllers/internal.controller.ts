import { Controller, Get } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoleTypeormEntity } from '../../persistence/typeorm/entities/role.typeorm-entity';

@Controller('internal')
export class RoleInternalController {
  constructor(
    @InjectRepository(RoleTypeormEntity)
    private readonly roleRepo: Repository<RoleTypeormEntity>,
  ) {}

  @Get('roles')
  async getAllRoles(): Promise<RoleTypeormEntity[]> {
    return this.roleRepo.find();
  }
}
