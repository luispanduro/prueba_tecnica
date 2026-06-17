/**
 * Value Object representing a valid username.
 */
export class Username {
  readonly value: string;

  constructor(value: string) {
    if (!value || value.trim().length === 0) {
      throw new Error('Username is required');
    }
    if (value.trim().length < 3) {
      throw new Error('Username must be at least 3 characters');
    }
    if (value.trim().length > 100) {
      throw new Error('Username must be at most 100 characters');
    }
    this.value = value.trim();
  }

  equals(other: Username): boolean {
    return this.value === other.value;
  }
}
