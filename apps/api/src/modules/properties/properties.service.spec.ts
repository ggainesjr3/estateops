import { NotFoundException } from '@nestjs/common';
import { PropertyStatus, PropertyType } from '@estateops/shared';
import { runWithTenant } from '../../test/tenant-test.util';

jest.mock('./repositories/property.repository', () => ({
  PropertyRepository: class PropertyRepository {},
}));
jest.mock('../storage/storage.service', () => ({
  StorageService: class StorageService {},
}));
jest.mock('../audit-logs/audit-log.service', () => ({
  AuditLogService: class AuditLogService {},
}));
jest.mock('./mappers/property.mapper', () => ({
  toPropertyResponseDto: (property: {
    id: string;
    orgId: string;
    name: string;
    type: PropertyType;
    status: PropertyStatus;
    createdAt: Date;
    updatedAt: Date;
  }) => ({
    id: property.id,
    orgId: property.orgId,
    name: property.name,
    type: property.type,
    status: property.status,
    createdAt: property.createdAt.toISOString(),
    updatedAt: property.updatedAt.toISOString(),
  }),
  toPropertyDetailResponseDto: jest.fn(),
}));

import { PropertiesService } from './properties.service';

describe('PropertiesService', () => {
  const orgId = '11111111-1111-1111-1111-111111111111';
  const userId = '22222222-2222-2222-2222-222222222222';

  let service: PropertiesService;
  let propertyRepository: {
    create: jest.Mock;
    findPage: jest.Mock;
    findByIdWithSummary: jest.Mock;
    update: jest.Mock;
    softDelete: jest.Mock;
  };

  const property = {
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    orgId,
    name: 'Oak Apartments',
    type: PropertyType.RESIDENTIAL,
    addressLine1: '1 Main St',
    addressLine2: null,
    city: 'Austin',
    state: 'TX',
    postalCode: '78701',
    country: 'US',
    latitude: null,
    longitude: null,
    status: PropertyStatus.ACTIVE,
    createdBy: userId,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    deletedAt: null,
    organization: {} as never,
    creator: {} as never,
    buildings: [],
    units: [],
  };

  beforeEach(() => {
    propertyRepository = {
      create: jest.fn(),
      findPage: jest.fn(),
      findByIdWithSummary: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    };

    const storageService = {
      createPropertyFolders: jest.fn().mockResolvedValue(undefined),
    };
    const auditLog = { log: jest.fn().mockResolvedValue(undefined) };

    service = new PropertiesService(
      propertyRepository as never,
      storageService as never,
      auditLog as never,
    );
  });

  it('creates property with current user as createdBy', async () => {
    propertyRepository.create.mockResolvedValue(property);

    await runWithTenant(orgId, userId, async () => {
      const result = await service.create({
        name: 'Oak Apartments',
        type: PropertyType.RESIDENTIAL,
        addressLine1: '1 Main St',
        city: 'Austin',
        state: 'TX',
        postalCode: '78701',
      });

      expect(propertyRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ createdBy: userId, status: PropertyStatus.ACTIVE }),
      );
      expect(result.id).toBe(property.id);
      expect(result.orgId).toBe(orgId);
    });
  });

  it('lists properties with cursor page', async () => {
    propertyRepository.findPage.mockResolvedValue({
      items: [property],
      nextCursor: null,
      hasMore: false,
    });

    await runWithTenant(orgId, userId, async () => {
      const page = await service.list({ limit: 10 });
      expect(page.items).toHaveLength(1);
      expect(page.hasMore).toBe(false);
      expect(propertyRepository.findPage).toHaveBeenCalledWith(
        { type: undefined, status: undefined, city: undefined },
        undefined,
        10,
      );
    });
  });

  it('throws when property is not found', async () => {
    propertyRepository.findByIdWithSummary.mockResolvedValue(null);

    await runWithTenant(orgId, userId, async () => {
      await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
    });
  });
});
