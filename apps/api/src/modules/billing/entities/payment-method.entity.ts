import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PaymentMethodType } from '@estateops/shared';
import { Organization } from '../../organizations/entities/organization.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';

@Entity('payment_methods')
@Index('idx_payment_methods_org_tenant', ['orgId', 'tenantId'])
export class PaymentMethod {
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

  @Column({ name: 'stripe_payment_method_id', type: 'varchar', length: 255 })
  stripePaymentMethodId!: string;

  @Column({
    type: 'enum',
    enum: PaymentMethodType,
    enumName: 'stored_payment_method_type',
  })
  type!: PaymentMethodType;

  @Column({ name: 'bank_last4', type: 'varchar', length: 4, nullable: true })
  bankLast4!: string | null;

  @Column({ name: 'card_last4', type: 'varchar', length: 4, nullable: true })
  cardLast4!: string | null;

  @Column({ name: 'is_default', type: 'boolean', default: false })
  isDefault!: boolean;

  @Column({ name: 'plaid_access_token_encrypted', type: 'text', nullable: true })
  plaidAccessTokenEncrypted!: string | null;

  @Column({ name: 'verified_at', type: 'timestamptz', nullable: true })
  verifiedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
