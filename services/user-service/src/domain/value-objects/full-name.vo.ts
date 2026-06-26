import { InvalidFullNameException } from '../exceptions/invalid-full-name.exception';

export class FullName {
  private readonly firstName: string;
  private readonly lastName: string;

  private constructor(firstName: string, lastName: string) {
    this.firstName = firstName;
    this.lastName = lastName;
  }

  static create(firstName: string, lastName: string): FullName {
    const first = firstName.trim();
    const last = lastName.trim();
    if (!first || !last || (first + ' ' + last).length > 100) {
      throw new InvalidFullNameException(firstName, lastName);
    }
    return new FullName(first, last);
  }

  getFirstName(): string {
    return this.firstName;
  }

  getLastName(): string {
    return this.lastName;
  }

  getFullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  equals(other: FullName): boolean {
    return this.firstName === other.firstName && this.lastName === other.lastName;
  }
}
