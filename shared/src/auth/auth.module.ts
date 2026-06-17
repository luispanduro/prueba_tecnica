import { Global, Module } from '@nestjs/common';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RoleGuard } from './guards/role.guard';

/**
 * AuthModule provides JWT authentication and role-based authorization guards.
 * Import this module in any microservice to enable @UseGuards(JwtAuthGuard, RoleGuard)
 * and @Roles() decorator on controllers/handlers.
 */
@Global()
@Module({
  providers: [JwtAuthGuard, RoleGuard],
  exports: [JwtAuthGuard, RoleGuard],
})
export class AuthModule {}
