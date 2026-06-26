import { BadRequestException } from '@nestjs/common';

export class InvalidFullNameException extends BadRequestException {
  constructor(firstName: string, lastName: string) {
    super(`Invalid full name: "${firstName} ${lastName}"`);
  }
}
