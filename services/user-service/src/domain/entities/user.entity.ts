import { Email } from '../value-objects/email.vo';
import { Username } from '../value-objects/username.vo';

/**
 * Domain entity representing a user in the system.
 */
export class User {
  readonly id: string;
  readonly username: Username;
  readonly email: Email;
  readonly firstName: string;
  readonly lastName: string;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: {
    id: string;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = props.id;
    this.username = new Username(props.username);
    this.email = new Email(props.email);
    this.firstName = this.validateName(props.firstName, 'First name');
    this.lastName = this.validateName(props.lastName, 'Last name');
    this.isActive = props.isActive;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  private validateName(value: string, fieldName: string): string {
    if (!value || value.trim().length === 0) {
      throw new Error(`${fieldName} is required`);
    }
    return value.trim();
  }
}
