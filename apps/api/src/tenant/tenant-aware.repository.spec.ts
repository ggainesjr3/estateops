import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { EntityManager, ObjectLiteral, Repository } from 'typeorm';
import { TenantAwareRepository } from './tenant-aware.repository';
import { OrgScopedEntity } from './interfaces/org-scoped.entity';
import { TenantContext } from './tenant.context';

interface TestEntity extends OrgScopedEntity, ObjectLiteral {
  id: string;
  orgId: string;
  name: string;
  deletedAt?: Date | null;
}

class TestRepository extends TenantAwareRepository<TestEntity> {}

describe('TenantAwareRepository', () => {
  const orgA = '11111111-1111-1111-1111-111111111111';
  const orgB = '22222222-2222-2222-2222-222222222222';
  const userId = '33333333-3333-3333-3333-333333333333';

  let repository: jest.Mocked<Repository<TestEntity>>;
  let tenantRepo: TestRepository;

  beforeEach(() => {
    repository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      softDelete: jest.fn(),
      createQueryBuilder: jest.fn(),
      manager: { transaction: jest.fn() },
      metadata: {
        columns: [{ propertyName: 'orgId', databaseName: 'org_id' }],
        deleteDateColumn: { propertyName: 'deletedAt' },
      },
    } as unknown as jest.Mocked<Repository<TestEntity>>;

    tenantRepo = new TestRepository(repository);
  });

  it('injects org_id on findAll', async () => {
    TenantContext.run({ orgId: orgA, userId }, async () => {
      repository.find.mockResolvedValue([]);
      await tenantRepo.findAll({ name: 'Main' });
      expect(repository.find).toHaveBeenCalledWith({
        where: { name: 'Main', orgId: orgA },
      });
    });
  });

  it('blocks cross-tenant access via findById', async () => {
    TenantContext.run({ orgId: orgA, userId }, async () => {
      repository.findOne.mockResolvedValue(null);
      const result = await tenantRepo.findById('entity-1');
      expect(result).toBeNull();
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 'entity-1', orgId: orgA },
      });
    });
  });

  it('throws ForbiddenException when entity org_id mismatches', async () => {
    TenantContext.run({ orgId: orgA, userId }, async () => {
      const foreign: TestEntity = { id: 'e1', orgId: orgB, name: 'X' };
      repository.findOne.mockResolvedValue(foreign);
      await expect(tenantRepo.update('e1', { name: 'Y' })).rejects.toThrow(ForbiddenException);
    });
  });

  it('scopes QueryBuilder with org_id', () => {
    const qb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };
    repository.createQueryBuilder.mockReturnValue(qb as never);

    TenantContext.run({ orgId: orgA, userId }, () => {
      tenantRepo.createScopedQueryBuilder('entity');
      expect(qb.where).toHaveBeenCalledWith('entity.org_id = :orgId', { orgId: orgA });
    });
  });

  it('works inside transactions', async () => {
    repository.manager.transaction = jest.fn(
      async (fn: (manager: EntityManager) => Promise<unknown>) => {
        await fn(repository.manager as EntityManager);
        return undefined;
      },
    ) as unknown as Repository<TestEntity>['manager']['transaction'];

    TenantContext.run({ orgId: orgA, userId }, async () => {
      repository.find.mockResolvedValue([]);
      await tenantRepo.withTransaction(async () => {
        await tenantRepo.findAll();
      });
      expect(repository.find).toHaveBeenCalledWith({
        where: { orgId: orgA },
      });
    });
  });

  it('softDelete throws when entity is missing', async () => {
    TenantContext.run({ orgId: orgA, userId }, async () => {
      repository.findOne.mockResolvedValue(null);
      await expect(tenantRepo.softDelete('missing')).rejects.toThrow(NotFoundException);
    });
  });
});
