import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { MaintenanceTicketStatus } from '@estateops/shared';
import { Organization } from '../../organizations/entities/organization.entity';
import { User } from '../../users/entities/user.entity';
import { MaintenanceTicket } from './maintenance-ticket.entity';

@Entity('ticket_updates')
@Index('idx_ticket_updates_ticket_id', ['ticketId', 'createdAt'])
export class TicketUpdate {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'org_id', type: 'uuid' })
  orgId!: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'org_id' })
  organization!: Organization;

  @Column({ name: 'ticket_id', type: 'uuid' })
  ticketId!: string;

  @ManyToOne(() => MaintenanceTicket, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ticket_id' })
  ticket!: MaintenanceTicket;

  @Column({
    name: 'status_from',
    type: 'enum',
    enum: MaintenanceTicketStatus,
    enumName: 'maintenance_ticket_status',
    nullable: true,
  })
  statusFrom!: MaintenanceTicketStatus | null;

  @Column({
    name: 'status_to',
    type: 'enum',
    enum: MaintenanceTicketStatus,
    enumName: 'maintenance_ticket_status',
  })
  statusTo!: MaintenanceTicketStatus;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  @Column({ name: 'updated_by_user_id', type: 'uuid', nullable: true })
  updatedByUserId!: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'updated_by_user_id' })
  updatedBy!: User | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
