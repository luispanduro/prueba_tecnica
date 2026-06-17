import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRolesAndUserRoles1700000000002 implements MigrationInterface {
  name = 'CreateRolesAndUserRoles1700000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create schema
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS roles`);

    // Create roles table
    await queryRunner.query(`
      CREATE TABLE roles.roles (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name VARCHAR(50) NOT NULL UNIQUE,
        description VARCHAR(255) NOT NULL DEFAULT '',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    // Create user_roles table
    await queryRunner.query(`
      CREATE TABLE roles.user_roles (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID NOT NULL,
        role_id UUID NOT NULL REFERENCES roles.roles(id) ON DELETE CASCADE,
        assigned_at TIMESTAMP NOT NULL DEFAULT NOW(),
        assigned_by UUID NOT NULL,
        CONSTRAINT uq_user_role UNIQUE (user_id, role_id)
      )
    `);

    // Indexes
    await queryRunner.query(`
      CREATE INDEX idx_roles_name ON roles.roles (name)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_user_roles_user_id ON roles.user_roles (user_id)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_user_roles_role_id ON roles.user_roles (role_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS roles.user_roles`);
    await queryRunner.query(`DROP TABLE IF EXISTS roles.roles`);
    await queryRunner.query(`DROP SCHEMA IF EXISTS roles`);
  }
}
