/**
 * Domain entity representing a role assignment to a user.
 */
export class UserRole {
  readonly id: string;
  readonly userId: string;
  readonly roleId: string;
  readonly assignedAt: Date;
  readonly assignedBy: string;

  constructor(props: {
    id: string;
    userId: string;
    roleId: string;
    assignedAt: Date;
    assignedBy: string;
  }) {
    if (!props.userId || props.userId.trim().length === 0) {
      throw new Error('User ID is required');
    }
    if (!props.roleId || props.roleId.trim().length === 0) {
      throw new Error('Role ID is required');
    }
    this.id = props.id;
    this.userId = props.userId;
    this.roleId = props.roleId;
    this.assignedAt = props.assignedAt;
    this.assignedBy = props.assignedBy;
  }
}
