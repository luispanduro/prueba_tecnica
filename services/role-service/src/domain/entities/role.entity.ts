import { RoleName } from '../value-objects/role-name.vo';

/**
 * Domain entity representing a role in the system.
 */
export class Role {
  readonly id: string;
  readonly name: RoleName;
  readonly description: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: {
    id: string;
    name: string;
    description: string;
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = props.id;
    this.name = new RoleName(props.name);
    this.description = props.description || '';
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }
}
