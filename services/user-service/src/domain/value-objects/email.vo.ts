/**
 * Value Object representing a valid email address.
 */
export class Email {
  readonly value: string;

  constructor(value: string) {
    if (!value || !Email.isValid(value)) {
      throw new Error('A valid email is required');
    }
    this.value = value.toLowerCase().trim();
  }

  static isValid(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  equals(other: Email): boolean {
    return this.value === other.value;
  }
}
