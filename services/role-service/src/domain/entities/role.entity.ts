import { NotFoundException } from '@nestjs/common';
import { RoleName } from '../value-objects/role-name.vo';
import { Permission } from '../value-objects/permission.vo';
import { SystemRoleModificationException } from '../exceptions/system-role-modification.exception';

export class Role {
  readonly id: string;
  private _name: RoleName;
  private _description: string;
  private _permissions: Permission[];
  readonly isSystem: boolean;
  readonly createdAt: Date;
  private _updatedAt: Date;

  private constructor(
    id: string,
    name: RoleName,
    description: string,
    permissions: Permission[],
    isSystem: boolean,
    createdAt: Date,
    updatedAt: Date,
  ) {
    this.id = id;
    this._name = name;
    this._description = description;
    this._permissions = [...permissions];
    this.isSystem = isSystem;
    this.createdAt = createdAt;
    this._updatedAt = updatedAt;
  }

  static create(
    id: string,
    name: RoleName,
    description: string,
    isSystem: boolean,
  ): Role {
    const now = new Date();
    return new Role(id, name, description, [], isSystem, now, now);
  }

  static reconstitute(
    id: string,
    name: RoleName,
    description: string,
    permissions: Permission[],
    isSystem: boolean,
    createdAt: Date,
    updatedAt: Date,
  ): Role {
    return new Role(id, name, description, permissions, isSystem, createdAt, updatedAt);
  }

  addPermission(permission: Permission): void {
    const exists = this._permissions.some((p) => p.equals(permission));
    if (!exists) {
      this._permissions.push(permission);
      this._updatedAt = new Date();
    }
  }

  removePermission(permission: Permission): void {
    const index = this._permissions.findIndex((p) => p.equals(permission));
    if (index === -1) {
      throw new NotFoundException(
        `Permission "${permission.getValue()}" not found in role`,
      );
    }
    this._permissions.splice(index, 1);
    this._updatedAt = new Date();
  }

  rename(name: RoleName): void {
    if (this.isSystem) {
      throw new SystemRoleModificationException();
    }
    this._name = name;
    this._updatedAt = new Date();
  }

  updateDescription(description: string): void {
    this._description = description;
    this._updatedAt = new Date();
  }

  get name(): RoleName {
    return this._name;
  }

  get description(): string {
    return this._description;
  }

  get permissions(): Permission[] {
    return [...this._permissions];
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }
}
