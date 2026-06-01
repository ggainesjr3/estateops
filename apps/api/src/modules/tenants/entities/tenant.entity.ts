import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { GovtIdType, TenantRecordStatus } from '@estateops/shared';
import { Organization } from '../../organizations/entities/organization.entity';
import { User } from '../../users/entities/user.entity';

@Entity('tenants')
@Index('idx_tenants_org_id', ['orgId'])
@Index('idx_tenants_org_email', ['orgId', 'email'], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'org_id', type: 'uuid' })
  orgId!: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'org_id' })
  organization!: Organization;

  @Index('idx_tenants_user_id')
  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId!: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'user_id' })
  user!: User | null;

  @Column({ name: 'first_name', type: 'varchar', length: 100 })
  firstName!: string;

  @Column({ name: 'last_name', type: 'varchar', length: 100 })
  lastName!: string;

  @Column({ type: 'varchar', length: 320 })
  email!: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  phone!: string | null;

  @Column({ type: 'date', nullable: true })
  dob!: string | null;

  @Column({
    name: 'govt_id_type',
    type: 'enum',
    enum: GovtIdType,
    enumName: 'govt_id_type',
    nullable: true,
  })
  govtIdType!: GovtIdType | null;

  @Column({ name: 'govt_id_last4', type: 'varchar', length: 4, nullable: true })
  govtIdLast4!: string | null;

  @Column({
    type: 'enum',
    enum: TenantRecordStatus,
    enumName: 'tenant_record_status',
    default: TenantRecordStatus.PROSPECT,
  })
  status!: TenantRecordStatus;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;
}
