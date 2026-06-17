/**
 * Domain entity representing user credentials for authentication.
 * Contains identity and authentication data only — no business profile data.
 */
export class UserCredentials {
  readonly id: string;
  readonly username: string;
  readonly email: string;
  readonly passwordHash: string;
  readonly isActive: boolean;
  readonly lastLoginAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: {
    id: string;
    username: string;
    email: string;
    passwordHash: string;
    isActive: boolean;
    lastLoginAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.validate(props);
    this.id = props.id;
    this.username = props.username;
    this.email = props.email;
    this.passwordHash = props.passwordHash;
    this.isActive = props.isActive;
    this.lastLoginAt = props.lastLoginAt;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  private validate(props: {
    username: string;
    email: string;
    passwordHash: string;
  }): void {
    if (!props.username || props.username.trim().length === 0) {
      throw new Error('Username is required');
    }
    if (!props.email || !this.isValidEmail(props.email)) {
      throw new Error('A valid email is required');
    }
    if (!props.passwordHash || props.passwordHash.trim().length === 0) {
      throw new Error('Password hash is required');
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
