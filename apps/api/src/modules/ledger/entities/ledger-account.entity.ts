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
import { LedgerAccountType } from '@estateops/shared';
import { Organization } from '../../organizations/entities/organization.entity';

@Entity('ledger_accounts')
@Index('idx_ledger_accounts_org_id', ['orgId'])
export class LedgerAccount {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'org_id', type: 'uuid' })
  orgId!: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'org_id' })
  organization!: Organization;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 32 })
  code!: string;

  @Column({
    type: 'enum',
    enum: LedgerAccountType,
    enumName: 'ledger_account_type',
  })
  type!: LedgerAccountType;

  @Column({ type: 'varchar', length: 64, nullable: true })
  subtype!: string | null;

  @Column({ name: 'is_system', type: 'boolean', default: false })
  isSystem!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
