import { TenantRecordStatus } from '@estateops/shared';
import { runWithTenant } from '../../test/tenant-test.util';

jest.mock('./repositories/tenant.repository', () => ({ TenantRepository: class TenantRepository {} }));
jest.mock('./repositories/emergency-contact.repository', () => ({
  EmergencyContactRepository: class EmergencyContactRepository {},
}));
jest.mock('../leases/repositories/lease.repository', () => ({
  LeaseRepository: class LeaseRepository {},
}));
jest.mock('./repositories/payment.repository', () => ({ PaymentRepository: class PaymentRepository {} }));
jest.mock('./mappers/tenant.mapper', () => ({
  toTenantDetailResponseDto: jest.fn((tenant) => ({
    id: tenant.id,
    userId: tenant.userId,
    email: tenant.email,
    emergencyContacts: [],
    activeLease: null,
  })),
  toPortalLeaseDto: jest.fn(),
  toPortalPaymentDto: jest.fn(),
}));

import { PortalService } from './portal.service';

describe('PortalService', () => {
  const orgId = '11111111-1111-1111-1111-111111111111';
  const userId = '22222222-2222-2222-2222-222222222222';

  const tenant = {
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    orgId,
    userId,
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane@example.com',
    phone: null,
    dob: null,
    govtIdType: null,
    govtIdLast4: '5678',
    status: TenantRecordStatus.ACTIVE,
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

  let service: PortalService;
  beforeEach(() => {
    const tenantRepository = {
      findByUserId: jest.fn().mockResolvedValue(tenant),
    };

    const emergencyContactRepository = {
      findByTenantId: jest.fn().mockResolvedValue([]),
    };

    const leaseRepository = {
      findActiveByUserId: jest.fn().mockResolvedValue(null),
    };

    const paymentRepository = {
      findByTenantId: jest.fn().mockResolvedValue([]),
    };

    service = new PortalService(
      tenantRepository as never,
      emergencyContactRepository as never,
      leaseRepository as never,
      paymentRepository as never,
    );
  });

  it('returns profile for linked user only', async () => {
    await runWithTenant(orgId, userId, async () => {
      const me = await service.getMe();
      expect(me.profile.userId).toBe(userId);
      expect(me.profile.email).toBe('jane@example.com');
      expect(me.paymentHistory).toEqual([]);
    });
  });
});
