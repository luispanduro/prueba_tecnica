import { InvalidRoleNameException } from '../exceptions/invalid-role-name.exception';

export class RoleName {
  private readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static create(raw: string): RoleName {
    const uppercased = raw.trim().toUpperCase();
    if (!uppercased || /\s/.test(uppercased) || uppercased.length > 50) {
      throw new InvalidRoleNameException(raw);
    }
    return new RoleName(uppercased);
  }

  getValue(): string {
    return this.value;
  }

  equals(other: RoleName): boolean {
    return this.value === other.value;
  }
}
