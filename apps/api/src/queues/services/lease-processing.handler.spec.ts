jest.mock('typeorm', () => ({ Repository: class Repository {} }));
jest.mock('@nestjs/typeorm', () => ({ InjectRepository: () => () => undefined }));
jest.mock('../../modules/leases/entities/lease.entity', () => ({ Lease: class Lease {} }));
jest.mock('../../modules/billing/entities/invoice.entity', () => ({ Invoice: class Invoice {} }));
jest.mock('../../modules/leases/leases.service', () => ({ LeasesService: class LeasesService {} }));
jest.mock('../../modules/billing/services/invoice.service', () => ({
  InvoiceService: class InvoiceService {},
}));
jest.mock('./org-job-context.service', () => ({
  OrgJobContextService: class OrgJobContextService {},
}));

import { LeaseStatus } from '@estateops/shared';
import { LeaseProcessingHandler } from './lease-processing.handler';

describe('LeaseProcessingHandler (lease-processing processor)', () => {
  it('expires leases past end date', async () => {
    const leasesService = { expireLease: jest.fn() };
    const invoiceService = { createRentInvoices: jest.fn(), createLateFeeInvoice: jest.fn() };
    const orgJobContext = {
      runAsOrg: jest.fn((_org: string, fn: () => Promise<number>) => fn()),
    };
    const qb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([{ id: 'lease-1' }]),
      getCount: jest.fn(),
    };
    const leaseRepository = { createQueryBuilder: jest.fn().mockReturnValue(qb) };
    const invoiceRepository = { createQueryBuilder: jest.fn() };

    const handler = new LeaseProcessingHandler(
      orgJobContext as never,
      leasesService as never,
      invoiceService as never,
      leaseRepository as never,
      invoiceRepository as never,
    );

    const count = await handler.runExpiryCheck({ orgId: 'org-1' });

    expect(count).toBe(1);
    expect(leasesService.expireLease).toHaveBeenCalledWith('lease-1', 'org-1');
    expect(qb.andWhere).toHaveBeenCalledWith('lease.status = :status', {
      status: LeaseStatus.ACTIVE,
    });
  });
});
