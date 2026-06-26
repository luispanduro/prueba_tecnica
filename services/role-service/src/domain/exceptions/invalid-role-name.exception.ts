import { BadRequestException } from '@nestjs/common';

export class InvalidRoleNameException extends BadRequestException {
  constructor(name: string) {
    super(`Invalid role name: "${name}". Must be uppercase, no spaces, max 50 chars.`);
  }
}
