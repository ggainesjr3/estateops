import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { DocumentEntityType, DocumentStorageProvider } from '@estateops/shared';
import { Organization } from '../../organizations/entities/organization.entity';
import { User } from '../../users/entities/user.entity';

@Entity('documents')
@Index('idx_documents_org_id', ['orgId'])
@Index('idx_documents_entity', ['orgId', 'entityType', 'entityId'])
export class Document {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'org_id', type: 'uuid' })
  orgId!: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'org_id' })
  organization!: Organization;

  @Column({
    name: 'entity_type',
    type: 'enum',
    enum: DocumentEntityType,
    enumName: 'document_entity_type',
  })
  entityType!: DocumentEntityType;

  @Column({ name: 'entity_id', type: 'uuid' })
  entityId!: string;

  @Column({ name: 'file_name', type: 'varchar', length: 500 })
  fileName!: string;

  @Column({ name: 'file_size', type: 'bigint' })
  fileSize!: string;

  @Column({ name: 'mime_type', type: 'varchar', length: 255 })
  mimeType!: string;

  @Column({ name: 'folder_path', type: 'varchar', length: 1024 })
  folderPath!: string;

  @Column({ name: 'sharepoint_item_id', type: 'varchar', length: 255, nullable: true })
  sharepointItemId!: string | null;

  @Column({ name: 'sharepoint_web_url', type: 'text', nullable: true })
  sharepointWebUrl!: string | null;

  @Column({
    name: 'storage_provider',
    type: 'enum',
    enum: DocumentStorageProvider,
    enumName: 'document_storage_provider',
  })
  storageProvider!: DocumentStorageProvider;

  @Column({ name: 'uploaded_by', type: 'uuid', nullable: true })
  uploadedBy!: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'uploaded_by' })
  uploader!: User | null;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
