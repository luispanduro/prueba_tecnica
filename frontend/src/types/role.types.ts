export interface Role {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRoleRequest {
  name: string;
  description?: string;
}

export interface AssignRoleRequest {
  userId: string;
  roleId: string;
}

export interface UnassignRoleRequest {
  userId: string;
  roleId: string;
}
