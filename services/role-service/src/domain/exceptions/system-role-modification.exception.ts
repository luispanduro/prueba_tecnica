import { ConflictException } from '@nestjs/common';

export class SystemRoleModificationException extends ConflictException {
  constructor() {
    super('Cannot modify or delete a system role');
  }
}
