import { NotFoundException } from '@nestjs/common';
import { FullName } from '../value-objects/full-name.vo';
import { Email } from '../value-objects/email.vo';
import { UserStatus } from '../value-objects/user-status.vo';

export class User {
  readonly id: string;
  private _name: FullName;
  private _email: Email;
  private _status: UserStatus;
  private _roleIds: string[];
  readonly createdAt: Date;
  private _updatedAt: Date;

  private constructor(
    id: string,
    name: FullName,
    email: Email,
    status: UserStatus,
    roleIds: string[],
    createdAt: Date,
    updatedAt: Date,
  ) {
    this.id = id;
    this._name = name;
    this._email = email;
    this._status = status;
    this._roleIds = [...roleIds];
    this.createdAt = createdAt;
    this._updatedAt = updatedAt;
  }

  static create(
    id: string,
    name: FullName,
    email: Email,
    roleIds: string[] = [],
  ): User {
    const now = new Date();
    return new User(id, name, email, UserStatus.ACTIVE, roleIds, now, now);
  }

  static reconstitute(
    id: string,
    name: FullName,
    email: Email,
    status: UserStatus,
    roleIds: string[],
    createdAt: Date,
    updatedAt: Date,
  ): User {
    return new User(id, name, email, status, roleIds, createdAt, updatedAt);
  }

  activate(): void {
    this._status = UserStatus.ACTIVE;
    this._updatedAt = new Date();
  }

  deactivate(): void {
    this._status = UserStatus.INACTIVE;
    this._updatedAt = new Date();
  }

  assignRole(roleId: string): void {
    if (!this._roleIds.includes(roleId)) {
      this._roleIds.push(roleId);
      this._updatedAt = new Date();
    }
  }

  removeRole(roleId: string): void {
    const index = this._roleIds.indexOf(roleId);
    if (index === -1) {
      throw new NotFoundException(`Role "${roleId}" not assigned to user`);
    }
    this._roleIds.splice(index, 1);
    this._updatedAt = new Date();
  }

  update(name: FullName, email: Email): void {
    this._name = name;
    this._email = email;
    this._updatedAt = new Date();
  }

  get name(): FullName {
    return this._name;
  }

  get email(): Email {
    return this._email;
  }

  get status(): UserStatus {
    return this._status;
  }

  get roleIds(): string[] {
    return [...this._roleIds];
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }
}
