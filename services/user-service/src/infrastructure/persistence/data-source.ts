import { DataSource } from 'typeorm';
import { UserOrmEntity } from './entities/user.orm-entity';

/**
 * TypeORM DataSource for CLI operations (migrations, etc).
 * For app runtime, use TypeOrmModule.forRootAsync in the AppModule.
 */
export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
  username: process.env.POSTGRES_USER || 'admin',
  password: process.env.POSTGRES_PASSWORD || 'admin123',
  database: process.env.POSTGRES_DB || 'user_management',
  schema: 'users',
  entities: [UserOrmEntity],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false,
});
