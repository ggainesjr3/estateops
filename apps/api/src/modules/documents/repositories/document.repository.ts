import { Injectable, NotFoundException } from '@nestjs/common';
import { DocumentEntityType } from '@estateops/shared';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { TenantAwareRepository } from '../../../tenant/tenant-aware.repository';
import { Document } from '../entities/document.entity';

@Injectable()
export class DocumentRepository extends TenantAwareRepository<Document> {
  constructor(
    @InjectRepository(Document)
    repository: Repository<Document>,
  ) {
    super(repository);
  }

  async findActiveById(id: string): Promise<Document | null> {
    return this.repository.findOne({
      where: {
        id,
        orgId: this.getOrgId(),
        deletedAt: IsNull(),
      } as never,
    });
  }

  async findByEntity(
    entityType: DocumentEntityType,
    entityId: string,
  ): Promise<Document[]> {
    return this.repository.find({
      where: {
        orgId: this.getOrgId(),
        entityType,
        entityId,
        deletedAt: IsNull(),
      } as never,
      order: { createdAt: 'DESC' },
    });
  }

  async softDeleteDocument(id: string): Promise<void> {
    const doc = await this.findActiveById(id);
    if (!doc) {
      throw new NotFoundException('Document not found');
    }
    await this.repository.softDelete(id);
  }
}
