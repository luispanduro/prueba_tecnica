import { BadRequestException } from '@nestjs/common';

export class InvalidEmailException extends BadRequestException {
  constructor(value: string) {
    super(`Invalid email address: "${value}"`);
  }
}
