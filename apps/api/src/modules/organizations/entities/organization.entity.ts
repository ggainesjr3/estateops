import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { OrganizationPlan } from '@estateops/shared';

@Entity('organizations')
export class Organization {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Index('idx_organizations_slug', { unique: true })
  @Column({ type: 'varchar', length: 100, unique: true })
  slug!: string;

  @Column({
    type: 'enum',
    enum: OrganizationPlan,
    enumName: 'organization_plan',
    default: OrganizationPlan.STARTER,
  })
  plan!: OrganizationPlan;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'branding_logo_url', type: 'varchar', length: 2048, nullable: true })
  brandingLogoUrl!: string | null;

  @Column({ name: 'branding_primary_color', type: 'varchar', length: 32, nullable: true })
  brandingPrimaryColor!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;
}
