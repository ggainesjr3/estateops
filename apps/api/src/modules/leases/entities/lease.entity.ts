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
import { LeaseStatus, RentEscalationFrequency } from '@estateops/shared';
import { Organization } from '../../organizations/entities/organization.entity';
import { Property } from '../../properties/entities/property.entity';
import { Unit } from '../../properties/entities/unit.entity';
import { User } from '../../users/entities/user.entity';

@Entity('leases')
@Index('idx_leases_org_id', ['orgId'])
@Index('idx_leases_property_id', ['propertyId'])
@Index('idx_leases_unit_id', ['unitId'])
export class Lease {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'org_id', type: 'uuid' })
  orgId!: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'org_id' })
  organization!: Organization;

  @Column({ name: 'property_id', type: 'uuid' })
  propertyId!: string;

  @ManyToOne(() => Property, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'property_id' })
  property!: Property;

  @Column({ name: 'unit_id', type: 'uuid' })
  unitId!: string;

  @ManyToOne(() => Unit, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'unit_id' })
  unit!: Unit;

  @Column({
    type: 'enum',
    enum: LeaseStatus,
    enumName: 'lease_status',
    default: LeaseStatus.DRAFT,
  })
  status!: LeaseStatus;

  @Column({ type: 'int', default: 1 })
  version!: number;

  @Column({ name: 'start_date', type: 'date' })
  startDate!: string;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate!: string | null;

  @Column({ name: 'monthly_rent', type: 'decimal', precision: 12, scale: 2 })
  monthlyRent!: string;

  @Column({ name: 'security_deposit', type: 'decimal', precision: 12, scale: 2, nullable: true })
  securityDeposit!: string | null;

  @Column({ name: 'late_fee_amount', type: 'decimal', precision: 12, scale: 2, nullable: true })
  lateFeeAmount!: string | null;

  @Column({ name: 'late_fee_grace_days', type: 'int', default: 0 })
  lateFeeGraceDays!: number;

  @Column({ name: 'rent_escalation_percent', type: 'decimal', precision: 5, scale: 2, default: 0 })
  rentEscalationPercent!: string;

  @Column({
    name: 'rent_escalation_frequency',
    type: 'enum',
    enum: RentEscalationFrequency,
    enumName: 'rent_escalation_frequency',
    default: RentEscalationFrequency.NONE,
  })
  rentEscalationFrequency!: RentEscalationFrequency;

  @Column({ name: 'signed_by_tenant_at', type: 'timestamptz', nullable: true })
  signedByTenantAt!: Date | null;

  @Column({ name: 'signed_by_manager_at', type: 'timestamptz', nullable: true })
  signedByManagerAt!: Date | null;

  @Column({ name: 'terminated_at', type: 'timestamptz', nullable: true })
  terminatedAt!: Date | null;

  @Column({ name: 'termination_reason', type: 'varchar', length: 500, nullable: true })
  terminationReason!: string | null;

  @Column({ name: 'renewed_from_lease_id', type: 'uuid', nullable: true })
  renewedFromLeaseId!: string | null;

  @ManyToOne(() => Lease, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'renewed_from_lease_id' })
  renewedFromLease!: Lease | null;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy!: string | null;

  @ManyToOne(() => User, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'created_by' })
  creator!: User | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;
}
