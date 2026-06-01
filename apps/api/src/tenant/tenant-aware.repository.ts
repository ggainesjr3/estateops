import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  DeepPartial,
  EntityManager,
  FindOptionsWhere,
  ObjectLiteral,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';
import { OrgScopedEntity } from './interfaces/org-scoped.entity';
import { TenantContext } from './tenant.context';

export abstract class TenantAwareRepository<
  T extends OrgScopedEntity & ObjectLiteral,
> {
  constructor(
    protected readonly repository: Repository<T>,
    protected readonly orgIdProperty: keyof T & string = 'orgId' as keyof T & string,
  ) {}

  protected getOrgId(): string {
    return TenantContext.getOrgId();
  }

  protected orgColumn(alias: string): string {
    const column = this.repository.metadata.columns.find(
      (c) => c.propertyName === this.orgIdProperty,
    );
    const dbName = column?.databaseName ?? 'org_id';
    return `${alias}.${dbName}`;
  }

  createScopedQueryBuilder(alias: string): SelectQueryBuilder<T> {
    return this.repository
      .createQueryBuilder(alias)
      .where(`${this.orgColumn(alias)} = :orgId`, { orgId: this.getOrgId() });
  }

  async findAll(filters: FindOptionsWhere<T> = {}): Promise<T[]> {
    const orgId = this.getOrgId();
    return this.repository.find({
      where: { ...filters, [this.orgIdProperty]: orgId } as FindOptionsWhere<T>,
    });
  }

  async findById(id: string): Promise<T | null> {
    return this.repository.findOne({
      where: {
        id,
        [this.orgIdProperty]: this.getOrgId(),
      } as unknown as FindOptionsWhere<T>,
    });
  }

  async findByIdOrFail(id: string): Promise<T> {
    const entity = await this.findById(id);
    if (!entity) {
      throw new NotFoundException('Resource not found');
    }
    return entity;
  }

  async create(dto: DeepPartial<T>): Promise<T> {
    const orgId = this.getOrgId();
    const entity = this.repository.create({
      ...dto,
      [this.orgIdProperty]: orgId,
    } as DeepPartial<T>);
    return this.repository.save(entity);
  }

  async update(id: string, dto: DeepPartial<T>): Promise<T> {
    const entity = await this.findByIdOrFail(id);
    this.assertSameOrg(entity);
    Object.assign(entity, dto);
    (entity as Record<string, unknown>)[this.orgIdProperty] = this.getOrgId();
    return this.repository.save(entity);
  }

  async softDelete(id: string): Promise<void> {
    const entity = await this.findByIdOrFail(id);
    this.assertSameOrg(entity);
    if (!this.repository.metadata.deleteDateColumn) {
      throw new BadRequestException('Entity does not support soft delete');
    }
    await this.repository.softDelete(id);
  }

  protected assertSameOrg(entity: T): void {
    const entityOrgId = entity[this.orgIdProperty];
    if (entityOrgId !== this.getOrgId()) {
      throw new ForbiddenException('Cross-tenant access denied');
    }
  }

  async withTransaction<R>(fn: (manager: EntityManager) => Promise<R>): Promise<R> {
    return this.repository.manager.transaction(fn);
  }
}
