import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CommunicationChannel, CommunicationDirection } from '@estateops/shared';
import { Organization } from '../../organizations/entities/organization.entity';
import { User } from '../../users/entities/user.entity';
import { Tenant } from './tenant.entity';

@Entity('tenant_communication_history')
@Index('idx_tenant_communication_history_org_id', ['orgId'])
@Index('idx_tenant_communication_history_tenant_id', ['tenantId'])
export class TenantCommunicationHistory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'org_id', type: 'uuid' })
  orgId!: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'org_id' })
  organization!: Organization;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({
    type: 'enum',
    enum: CommunicationChannel,
    enumName: 'communication_channel',
  })
  channel!: CommunicationChannel;

  @Column({
    type: 'enum',
    enum: CommunicationDirection,
    enumName: 'communication_direction',
  })
  direction!: CommunicationDirection;

  @Column({ type: 'varchar', length: 500, nullable: true })
  subject!: string | null;

  @Column({ type: 'text' })
  body!: string;

  @Column({ name: 'sent_by_user_id', type: 'uuid', nullable: true })
  sentByUserId!: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'sent_by_user_id' })
  sentByUser!: User | null;

  @Column({ name: 'sent_at', type: 'timestamptz', default: () => 'now()' })
  sentAt!: Date;
}
