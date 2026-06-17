/**
 * Seed Script - Initial Admin Data
 *
 * Creates the minimum data required to operate the system:
 * - Role: admin
 * - User: administrator
 * - Credentials: admin login with bcrypt-hashed password
 * - Assignment: admin role → admin user
 *
 * Usage: npx ts-node scripts/seed.ts
 *
 * Idempotent: safe to run multiple times without duplicating data.
 *
 * Required environment variables (see .env.example):
 * - POSTGRES_HOST, POSTGRES_PORT, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB
 * - ADMIN_USER_ID, ADMIN_USERNAME, ADMIN_EMAIL, ADMIN_PASSWORD
 * - ADMIN_FIRST_NAME, ADMIN_LAST_NAME
 */

import { Client } from 'pg';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();

const SALT_ROUNDS = 12;

// Admin configuration from environment
const ADMIN_USER_ID = process.env.ADMIN_USER_ID || 'a0000000-0000-0000-0000-000000000001';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const ADMIN_FIRST_NAME = process.env.ADMIN_FIRST_NAME || 'System';
const ADMIN_LAST_NAME = process.env.ADMIN_LAST_NAME || 'Administrator';

const ADMIN_ROLE_ID = 'b0000000-0000-0000-0000-000000000001';
const ADMIN_ROLE_NAME = 'admin';

async function seed() {
  const client = new Client({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    user: process.env.POSTGRES_USER || 'admin',
    password: process.env.POSTGRES_PASSWORD || 'admin123',
    database: process.env.POSTGRES_DB || 'user_management',
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL');

    // Ensure schemas exist
    await client.query('CREATE SCHEMA IF NOT EXISTS auth');
    await client.query('CREATE SCHEMA IF NOT EXISTS users');
    await client.query('CREATE SCHEMA IF NOT EXISTS roles');

    // 1. Create admin role (idempotent)
    const roleExists = await client.query(
      'SELECT id FROM roles.roles WHERE id = $1 OR name = $2',
      [ADMIN_ROLE_ID, ADMIN_ROLE_NAME],
    );

    if (roleExists.rowCount === 0) {
      await client.query(
        `INSERT INTO roles.roles (id, name, description, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), NOW())`,
        [ADMIN_ROLE_ID, ADMIN_ROLE_NAME, 'System administrator role'],
      );
      console.log('✓ Created admin role');
    } else {
      console.log('→ Admin role already exists, skipping');
    }

    // 2. Create admin user in users schema (idempotent)
    const userExists = await client.query(
      'SELECT id FROM users.users WHERE id = $1 OR username = $2',
      [ADMIN_USER_ID, ADMIN_USERNAME],
    );

    if (userExists.rowCount === 0) {
      await client.query(
        `INSERT INTO users.users (id, username, email, first_name, last_name, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())`,
        [ADMIN_USER_ID, ADMIN_USERNAME, ADMIN_EMAIL, ADMIN_FIRST_NAME, ADMIN_LAST_NAME],
      );
      console.log('✓ Created admin user');
    } else {
      console.log('→ Admin user already exists, skipping');
    }

    // 3. Create admin credentials in auth schema (idempotent)
    const credExists = await client.query(
      'SELECT id FROM auth.users_credentials WHERE id = $1 OR username = $2',
      [ADMIN_USER_ID, ADMIN_USERNAME],
    );

    if (credExists.rowCount === 0) {
      const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, SALT_ROUNDS);
      await client.query(
        `INSERT INTO auth.users_credentials (id, username, email, password_hash, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, true, NOW(), NOW())`,
        [ADMIN_USER_ID, ADMIN_USERNAME, ADMIN_EMAIL, passwordHash],
      );
      console.log('✓ Created admin credentials (password hashed with bcrypt)');
    } else {
      console.log('→ Admin credentials already exist, skipping');
    }

    // 4. Assign admin role to admin user (idempotent)
    const assignExists = await client.query(
      'SELECT id FROM roles.user_roles WHERE user_id = $1 AND role_id = $2',
      [ADMIN_USER_ID, ADMIN_ROLE_ID],
    );

    if (assignExists.rowCount === 0) {
      await client.query(
        `INSERT INTO roles.user_roles (id, user_id, role_id, assigned_at, assigned_by)
         VALUES (gen_random_uuid(), $1, $2, NOW(), $1)`,
        [ADMIN_USER_ID, ADMIN_ROLE_ID],
      );
      console.log('✓ Assigned admin role to admin user');
    } else {
      console.log('→ Admin role assignment already exists, skipping');
    }

    console.log('\n=== Seed completed successfully ===');
    console.log(`\nAdmin login credentials:`);
    console.log(`  POST /auth/login`);
    console.log(`  { "usernameOrEmail": "${ADMIN_USERNAME}", "password": "${ADMIN_PASSWORD}" }`);
    console.log(`\nThe resulting JWT will contain role: admin`);
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

seed();
