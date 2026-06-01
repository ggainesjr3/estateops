import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { CommunicationChannel, TenantRecordStatus } from '@estateops/shared';
import { runWithTenant } from '../../test/tenant-test.util';

jest.mock('./repositories/tenant.repository', () => ({ TenantRepository: class TenantRepository {} }));
jest.mock('./repositories/emergency-contact.repository', () => ({
  EmergencyContactRepository: class EmergencyContactRepository {},
}));
jest.mock('./repositories/communication-history.repository', () => ({
  CommunicationHistoryRepository: class CommunicationHistoryRepository {},
}));
jest.mock('../leases/repositories/lease.repository', () => ({
  LeaseRepository: class LeaseRepository {},
}));
jest.mock('./services/communication-queue.service', () => ({
  CommunicationQueueService: class CommunicationQueueService {},
}));
jest.mock('./mappers/tenant.mapper', () => ({
  toTenantResponseDto: (tenant: {
    id: string;
    orgId: string;
    userId: string | null;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    status: TenantRecordStatus;
    createdAt: Date;
    updatedAt: Date;
  }) => ({
    id: tenant.id,
    orgId: tenant.orgId,
    userId: tenant.userId,
    firstName: tenant.firstName,
    lastName: tenant.lastName,
    email: tenant.email,
    phone: tenant.phone,
    status: tenant.status,
    createdAt: tenant.createdAt.toISOString(),
    updatedAt: tenant.updatedAt.toISOString(),
  }),
  toTenantDetailResponseDto: (
    tenant: { id: string; orgId: string; govtIdLast4: string | null },
    _contacts: unknown[],
    _lease: unknown,
  ) => ({
    id: tenant.id,
    orgId: tenant.orgId,
    govtIdLast4: tenant.govtIdLast4,
    emergencyContacts: [],
    activeLease: null,
  }),
  toEmergencyContactResponseDto: jest.fn(),
  toCommunicationHistoryResponseDto: jest.fn(),
}));

import { TenantsService } from './tenants.service';
import { CommunicationQueueService } from './services/communication-queue.service';

describe('TenantsService', () => {
  const orgId = '11111111-1111-1111-1111-111111111111';
  const userId = '22222222-2222-2222-2222-222222222222';
  const tenantId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

  const tenant = {
    id: tenantId,
    orgId,
    userId: null,
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane@example.com',
    phone: null,
    dob: null,
    govtIdType: null,
    govtIdLast4: '1234',
    status: TenantRecordStatus.PROSPECT,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    organization: {} as never,
    user: null,
    emergencyContacts: [],
    communicationHistory: [],
    leases: [],
  };

  let service: TenantsService;
  let tenantRepository: {
    createUnique: jest.Mock;
    findPage: jest.Mock;
    findById: jest.Mock;
    findByEmail: jest.Mock;
    update: jest.Mock;
    softDelete: jest.Mock;
  };
  let emergencyContactRepository: { findByTenantId: jest.Mock; createForTenant: jest.Mock };
  let communicationRepository: { findPageByTenant: jest.Mock };
  let leaseRepository: { findActiveByTenantId: jest.Mock; hasActiveLease: jest.Mock };
  let communicationQueue: jest.Mocked<CommunicationQueueService>;

  beforeEach(() => {
    tenantRepository = {
      createUnique: jest.fn(),
      findPage: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    };

    emergencyContactRepository = {
      findByTenantId: jest.fn().mockResolvedValue([]),
      createForTenant: jest.fn(),
    };

    communicationRepository = {
      findPageByTenant: jest.fn(),
    };

    leaseRepository = {
      findActiveByTenantId: jest.fn().mockResolvedValue(null),
      hasActiveLease: jest.fn(),
    };

    communicationQueue = {
      queueOutboundMessage: jest.fn(),
    } as unknown as jest.Mocked<CommunicationQueueService>;

    service = new TenantsService(
      tenantRepository as never,
      emergencyContactRepository as never,
      communicationRepository as never,
      leaseRepository as never,
      communicationQueue,
    );
  });

  it('creates tenant without exposing govt id in list response', async () => {
    tenantRepository.createUnique.mockResolvedValue(tenant);

    await runWithTenant(orgId, userId, async () => {
      const result = await service.create({
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        govtIdLast4: '1234',
      });

      expect(result).not.toHaveProperty('govtIdLast4');
      expect(result).not.toHaveProperty('govtIdType');
      expect(result.email).toBe('jane@example.com');
    });
  });

  it('rejects duplicate email on create', async () => {
    tenantRepository.createUnique.mockRejectedValue(
      new ConflictException('A tenant with this email already exists in the organization'),
    );

    await runWithTenant(orgId, userId, async () => {
      await expect(
        service.create({ firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  it('blocks delete when active lease exists', async () => {
    leaseRepository.hasActiveLease.mockResolvedValue(true);

    await runWithTenant(orgId, userId, async () => {
      await expect(service.remove(tenantId)).rejects.toThrow(BadRequestException);
    });
  });

  it('detail includes masked govt id last4 only', async () => {
    tenantRepository.findById.mockResolvedValue(tenant);

    await runWithTenant(orgId, userId, async () => {
      const detail = await service.findOne(tenantId);
      expect(detail.govtIdLast4).toBe('1234');
      expect(detail).not.toHaveProperty('govtId');
    });
  });

  it('send-message queues outbound comm and returns id', async () => {
    communicationQueue.queueOutboundMessage.mockResolvedValue({
      communicationId: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    });

    await runWithTenant(orgId, userId, async () => {
      const result = await service.sendMessage(tenantId, {
        channel: CommunicationChannel.EMAIL,
        subject: 'Hello',
        body: 'Welcome',
      });

      expect(result.status).toBe('queued');
      expect(communicationQueue.queueOutboundMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId,
          channel: CommunicationChannel.EMAIL,
        }),
      );
    });
  });

  it('throws when tenant not found', async () => {
    tenantRepository.findById.mockResolvedValue(null);

    await runWithTenant(orgId, userId, async () => {
      await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
    });
  });
});
