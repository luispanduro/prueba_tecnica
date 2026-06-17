import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Unique,
} from 'typeorm';

@Entity('user_roles')
@Unique(['userId', 'roleId'])
export class UserRoleOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @Column({ type: 'uuid', name: 'role_id' })
  roleId!: string;

  @CreateDateColumn({ type: 'timestamp', name: 'assigned_at' })
  assignedAt!: Date;

  @Column({ type: 'uuid', name: 'assigned_by' })
  assignedBy!: string;
}
