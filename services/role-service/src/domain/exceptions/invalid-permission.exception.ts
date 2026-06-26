import { BadRequestException } from '@nestjs/common';

export class InvalidPermissionException extends BadRequestException {
  constructor(value: string) {
    super(`Invalid permission format: "${value}". Expected format: resource:action`);
  }
}
