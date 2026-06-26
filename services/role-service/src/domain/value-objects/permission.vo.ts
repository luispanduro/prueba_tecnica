import { InvalidPermissionException } from '../exceptions/invalid-permission.exception';

const PERMISSION_REGEX = /^[a-z_]+:[a-z_*]+$/;

export class Permission {
  private readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static create(raw: string): Permission {
    if (!raw || !PERMISSION_REGEX.test(raw)) {
      throw new InvalidPermissionException(raw);
    }
    return new Permission(raw);
  }

  getValue(): string {
    return this.value;
  }

  equals(other: Permission): boolean {
    return this.value === other.value;
  }
}
