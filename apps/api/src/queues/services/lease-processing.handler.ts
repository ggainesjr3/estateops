import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InvoiceStatus, InvoiceType, LeaseStatus } from '@estateops/shared';
import { Repository } from 'typeorm';
import { Invoice } from '../../modules/billing/entities/invoice.entity';
import { InvoiceService } from '../../modules/billing/services/invoice.service';
import { Lease } from '../../modules/leases/entities/lease.entity';
import { LeasesService } from '../../modules/leases/leases.service';
import { OrgJobContextService } from './org-job-context.service';

export interface LeaseJobScope {
  orgId: string;
  actorUserId?: string;
  leaseId?: string;
}

@Injectable()
export class LeaseProcessingHandler {
  private readonly logger = new Logger(LeaseProcessingHandler.name);

  constructor(
    private readonly orgJobContext: OrgJobContextService,
    private readonly leasesService: LeasesService,
    private readonly invoiceService: InvoiceService,
    @InjectRepository(Lease)
    private readonly leaseRepository: Repository<Lease>,
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
  ) {}

  async runExpiryCheck(scope: LeaseJobScope): Promise<number> {
    return this.orgJobContext.runAsOrg(
      scope.orgId,
      async () => {
        if (scope.leaseId) {
          await this.leasesService.expireLease(scope.leaseId, scope.orgId);
          return 1;
        }
        const today = new Date().toISOString().slice(0, 10);
        const expired = await this.leaseRepository
          .createQueryBuilder('lease')
          .where('lease.org_id = :orgId', { orgId: scope.orgId })
          .andWhere('lease.status = :status', { status: LeaseStatus.ACTIVE })
          .andWhere('lease.end_date IS NOT NULL')
          .andWhere('lease.end_date < :today', { today })
          .andWhere('lease.deleted_at IS NULL')
          .getMany();
        for (const lease of expired) {
          await this.leasesService.expireLease(lease.id, scope.orgId);
        }
        this.logger.log(`Expired ${expired.length} leases for org ${scope.orgId}`);
        return expired.length;
      },
      scope.actorUserId,
    );
  }

  async runRentInvoiceGeneration(scope: LeaseJobScope): Promise<number> {
    return this.orgJobContext.runAsOrg(
      scope.orgId,
      async () => {
        const leases = await this.leaseRepository.find({
          where: { orgId: scope.orgId, status: LeaseStatus.ACTIVE },
        });
        let created = 0;
        for (const lease of leases) {
          if (scope.leaseId && lease.id !== scope.leaseId) continue;
          await this.invoiceService.createRentInvoices(lease.id);
          created += 1;
        }
        this.logger.log(`Generated ${created} rent invoices for org ${scope.orgId}`);
        return created;
      },
      scope.actorUserId,
    );
  }

  async runLateFeeCheck(scope: LeaseJobScope): Promise<number> {
    return this.orgJobContext.runAsOrg(
      scope.orgId,
      async () => {
        const today = new Date().toISOString().slice(0, 10);
        const overdue = await this.invoiceRepository
          .createQueryBuilder('inv')
          .where('inv.org_id = :orgId', { orgId: scope.orgId })
          .andWhere('inv.type = :type', { type: InvoiceType.RENT })
          .andWhere('inv.status IN (:...statuses)', {
            statuses: [InvoiceStatus.SENT, InvoiceStatus.PARTIAL, InvoiceStatus.OVERDUE],
          })
          .andWhere('inv.due_date < :today', { today })
          .getMany();

        const leaseIds = [...new Set(overdue.map((inv) => inv.leaseId))];
        for (const leaseId of leaseIds) {
          await this.invoiceService.createLateFeeInvoice(leaseId);
        }
        return leaseIds.length;
      },
      scope.actorUserId,
    );
  }

  async runRenewalReminders(scope: LeaseJobScope): Promise<number> {
    return this.orgJobContext.runAsOrg(
      scope.orgId,
      async () => {
        const horizon = new Date();
        horizon.setDate(horizon.getDate() + 30);
        const horizonStr = horizon.toISOString().slice(0, 10);
        const today = new Date().toISOString().slice(0, 10);
        const count = await this.leaseRepository
          .createQueryBuilder('lease')
          .where('lease.org_id = :orgId', { orgId: scope.orgId })
          .andWhere('lease.status = :status', { status: LeaseStatus.ACTIVE })
          .andWhere('lease.end_date IS NOT NULL')
          .andWhere('lease.end_date BETWEEN :today AND :horizon', { today, horizon: horizonStr })
          .getCount();
        this.logger.log(`Renewal reminders due for ${count} leases in org ${scope.orgId}`);
        return count;
      },
      scope.actorUserId,
    );
  }
}
