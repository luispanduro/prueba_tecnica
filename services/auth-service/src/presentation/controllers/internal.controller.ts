import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { JwtAuthGuard, RoleGuard, Roles } from '@user-management/shared';
import { CreateCredentialsUseCase } from '../../application/use-cases/create-credentials.use-case';
import { CreateCredentialsDto } from '../dtos/create-credentials.dto';

/**
 * Internal controller for service-to-service credential management.
 * Protected with JWT + admin role.
 */
@Controller('auth/internal')
export class InternalController {
  constructor(private readonly createCredentialsUseCase: CreateCredentialsUseCase) {}

  @Post('credentials')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles('admin')
  async createCredentials(@Body() dto: CreateCredentialsDto) {
    const result = await this.createCredentialsUseCase.execute({
      userId: dto.userId,
      username: dto.username,
      email: dto.email,
      password: dto.password,
    });

    return {
      userId: result.userId,
      username: result.username,
      message: 'Credentials created successfully',
    };
  }
}
