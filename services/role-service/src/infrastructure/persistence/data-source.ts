import { DataSource } from 'typeorm';
import { RoleOrmEntity } from './entities/role.orm-entity';
import { UserRoleOrmEntity } from './entities/user-role.orm-entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
  username: process.env.POSTGRES_USER || 'admin',
  password: process.env.POSTGRES_PASSWORD || 'admin123',
  database: process.env.POSTGRES_DB || 'user_management',
  schema: 'roles',
  entities: [RoleOrmEntity, UserRoleOrmEntity],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false,
});
