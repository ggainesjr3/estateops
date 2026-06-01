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
import { UnitStatus, UnitType } from '@estateops/shared';
import { Organization } from '../../organizations/entities/organization.entity';
import { Building } from './building.entity';
import { Property } from './property.entity';

@Entity('units')
@Index('idx_units_org_id', ['orgId'])
@Index('idx_units_property_id', ['propertyId'])
export class Unit {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'org_id', type: 'uuid' })
  orgId!: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'org_id' })
  organization!: Organization;

  @Column({ name: 'property_id', type: 'uuid' })
  propertyId!: string;

  @ManyToOne(() => Property, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'property_id' })
  property!: Property;

  @Column({ name: 'building_id', type: 'uuid', nullable: true })
  buildingId!: string | null;

  @ManyToOne(() => Building, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'building_id' })
  building!: Building | null;

  @Column({ name: 'floor_number', type: 'int', nullable: true })
  floorNumber!: number | null;

  @Column({ name: 'unit_number', type: 'varchar', length: 50 })
  unitNumber!: string;

  @Column({
    type: 'enum',
    enum: UnitType,
    enumName: 'unit_type',
  })
  type!: UnitType;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  sqft!: string | null;

  @Column({ type: 'int', nullable: true })
  bedrooms!: number | null;

  @Column({ type: 'decimal', precision: 4, scale: 2, nullable: true })
  bathrooms!: string | null;

  @Column({
    type: 'enum',
    enum: UnitStatus,
    enumName: 'unit_status',
    default: UnitStatus.VACANT,
  })
  status!: UnitStatus;

  @Column({ name: 'monthly_rent', type: 'decimal', precision: 12, scale: 2, nullable: true })
  monthlyRent!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;
}
