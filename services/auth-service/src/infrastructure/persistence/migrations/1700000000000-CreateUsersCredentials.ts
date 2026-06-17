import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsersCredentials1700000000000 implements MigrationInterface {
  name = 'CreateUsersCredentials1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create schema if not exists
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS auth`);

    // Create users_credentials table
    await queryRunner.query(`
      CREATE TABLE auth.users_credentials (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        username VARCHAR(100) NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        last_login_at TIMESTAMP NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    // Create indexes
    await queryRunner.query(`
      CREATE INDEX idx_users_credentials_username ON auth.users_credentials (username)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_users_credentials_email ON auth.users_credentials (email)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS auth.users_credentials`);
    await queryRunner.query(`DROP SCHEMA IF EXISTS auth`);
  }
}
