import { Email } from '../value-objects/email.vo';
import { PasswordHash } from '../value-objects/password-hash.vo';

export class UserCredentials {
  readonly id: string;
  private _email: Email;
  private _passwordHash: PasswordHash;
  private _isActive: boolean;
  readonly createdAt: Date;
  private _updatedAt: Date;

  private constructor(
    id: string,
    email: Email,
    passwordHash: PasswordHash,
    isActive: boolean,
    createdAt: Date,
    updatedAt: Date,
  ) {
    this.id = id;
    this._email = email;
    this._passwordHash = passwordHash;
    this._isActive = isActive;
    this.createdAt = createdAt;
    this._updatedAt = updatedAt;
  }

  static create(
    id: string,
    email: Email,
    passwordHash: PasswordHash,
  ): UserCredentials {
    const now = new Date();
    return new UserCredentials(id, email, passwordHash, true, now, now);
  }

  static reconstitute(
    id: string,
    email: Email,
    passwordHash: PasswordHash,
    isActive: boolean,
    createdAt: Date,
    updatedAt: Date,
  ): UserCredentials {
    return new UserCredentials(id, email, passwordHash, isActive, createdAt, updatedAt);
  }

  async verifyPassword(plainText: string): Promise<boolean> {
    return this._passwordHash.verify(plainText);
  }

  deactivate(): void {
    this._isActive = false;
    this._updatedAt = new Date();
  }

  reactivate(): void {
    this._isActive = true;
    this._updatedAt = new Date();
  }

  get email(): Email {
    return this._email;
  }

  get passwordHash(): PasswordHash {
    return this._passwordHash;
  }

  get isActive(): boolean {
    return this._isActive;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }
}
