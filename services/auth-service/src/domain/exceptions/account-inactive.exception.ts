import { ForbiddenException } from '@nestjs/common';

export class AccountInactiveException extends ForbiddenException {
  constructor() {
    super('Account is inactive');
  }
}
