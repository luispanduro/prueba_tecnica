/**
 * Value Object representing a valid role name.
 */
export class RoleName {
  readonly value: string;

  constructor(value: string) {
    if (!value || value.trim().length === 0) {
      throw new Error('Role name is required');
    }
    if (value.trim().length > 50) {
      throw new Error('Role name must be at most 50 characters');
    }
    this.value = value.trim().toLowerCase();
  }

  equals(other: RoleName): boolean {
    return this.value === other.value;
  }
}
