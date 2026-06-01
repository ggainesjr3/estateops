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
import {
  MaintenanceTicketPriority,
  MaintenanceTicketStatus,
  MaintenanceTrade,
} from '@estateops/shared';
import { Organization } from '../../organizations/entities/organization.entity';
import { Property } from '../../properties/entities/property.entity';
import { Unit } from '../../properties/entities/unit.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { User } from '../../users/entities/user.entity';
import { Vendor } from './vendor.entity';

@Entity('maintenance_tickets')
@Index('idx_maintenance_tickets_org_id', ['orgId'])
@Index('idx_maintenance_tickets_status', ['orgId', 'status'])
export class MaintenanceTicket {
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

  @Column({ name: 'unit_id', type: 'uuid', nullable: true })
  unitId!: string | null;

  @ManyToOne(() => Unit, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'unit_id' })
  unit!: Unit | null;

  @Column({ name: 'tenant_id', type: 'uuid', nullable: true })
  tenantId!: string | null;

  @ManyToOne(() => Tenant, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant | null;

  @Column({ type: 'varchar', length: 500 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({
    type: 'enum',
    enum: MaintenanceTicketPriority,
    enumName: 'maintenance_ticket_priority',
    default: MaintenanceTicketPriority.MEDIUM,
  })
  priority!: MaintenanceTicketPriority;

  @Column({
    type: 'enum',
    enum: MaintenanceTicketStatus,
    enumName: 'maintenance_ticket_status',
    default: MaintenanceTicketStatus.CREATED,
  })
  status!: MaintenanceTicketStatus;

  @Column({
    type: 'enum',
    enum: MaintenanceTrade,
    enumName: 'maintenance_trade',
    default: MaintenanceTrade.GENERAL,
  })
  trade!: MaintenanceTrade;

  @Column({ name: 'ai_classification', type: 'jsonb', nullable: true })
  aiClassification!: Record<string, unknown> | null;

  @Column({ name: 'assigned_vendor_id', type: 'uuid', nullable: true })
  assignedVendorId!: string | null;

  @ManyToOne(() => Vendor, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'assigned_vendor_id' })
  assignedVendor!: Vendor | null;

  @Column({ name: 'assigned_staff_id', type: 'uuid', nullable: true })
  assignedStaffId!: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'assigned_staff_id' })
  assignedStaff!: User | null;

  @Column({ name: 'sla_due_at', type: 'timestamptz', nullable: true })
  slaDueAt!: Date | null;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt!: Date | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt!: Date | null;

  @Column({ name: 'invoiced_at', type: 'timestamptz', nullable: true })
  invoicedAt!: Date | null;

  @Column({ name: 'closed_at', type: 'timestamptz', nullable: true })
  closedAt!: Date | null;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy!: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by' })
  creator!: User | null;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
