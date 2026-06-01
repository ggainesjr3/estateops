import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  LeaseSignerRole,
  LeaseStatus,
  RentEscalationFrequency,
} from '@estateops/shared';
import { Repository } from 'typeorm';
import { TenantContext } from '../../tenant/tenant.context';
import { Tenant } from '../tenants/entities/tenant.entity';
import { TenantPayment } from '../tenants/entities/tenant-payment.entity';
import { CreateLeaseDto } from './dto/create-lease.dto';
import { ListLeasesQueryDto } from './dto/list-leases-query.dto';
import { SignLeaseDto } from './dto/sign-lease.dto';
import { TerminateLeaseDto } from './dto/terminate-lease.dto';
import { UpdateLeaseDto } from './dto/update-lease.dto';
import { Lease } from './entities/lease.entity';
import { LeaseTenant } from './entities/lease-tenant.entity';
import { calculateEscalatedRent } from './lease-rent-escalation.util';
import { LeaseStateMachineService } from './lease-state-machine.service';
import {
  buildLeaseSnapshot,
  toLeaseDetailResponseDto,
  toLeaseResponseDto,
  toLeaseVersionResponseDto,
} from './lease.mapper';
import {
  LeaseDetailResponseDto,
  LeaseResponseDto,
  LeaseVersionResponseDto,
} from './dto/lease-response.dto';
import { LeaseRepository } from './repositories/lease.repository';
import { LeaseTenantRepository } from './repositories/lease-tenant.repository';
import { LeaseVersionRepository } from './repositories/lease-version.repository';
import { LeaseExpirationScheduler } from './services/lease-expiration.scheduler';

@Injectable()
export class LeasesService {
  constructor(
    private readonly leaseRepository: LeaseRepository,
    private readonly leaseTenantRepository: LeaseTenantRepository,
    private readonly leaseVersionRepository: LeaseVersionRepository,
    private readonly stateMachine: LeaseStateMachineService,
    private readonly expirationScheduler: LeaseExpirationScheduler,
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
  ) {}

  async create(dto: CreateLeaseDto): Promise<LeaseResponseDto> {
    if (!dto.tenants.length) {
      throw new BadRequestException('At least one tenant is required');
    }
    const primaryCount = dto.tenants.filter((t) => t.isPrimary).length;
    if (primaryCount !== 1) {
      throw new BadRequestException('Exactly one primary tenant is required');
    }

    const orgId = TenantContext.getOrgId();
    const userId = TenantContext.getUserId();

    for (const t of dto.tenants) {
      const tenant = await this.tenantRepo.findOne({
        where: { id: t.tenantId, orgId },
      });
      if (!tenant) {
        throw new NotFoundException(`Tenant ${t.tenantId} not found`);
      }
    }

    const lease = await this.leaseRepository.create({
      propertyId: dto.propertyId,
      unitId: dto.unitId,
      status: LeaseStatus.DRAFT,
      version: 1,
      startDate: dto.startDate,
      endDate: dto.endDate ?? null,
      monthlyRent: dto.monthlyRent,
      securityDeposit: dto.securityDeposit ?? null,
      lateFeeAmount: dto.lateFeeAmount ?? null,
      lateFeeGraceDays: dto.lateFeeGraceDays ?? 0,
      rentEscalationPercent: dto.rentEscalationPercent ?? '0',
      rentEscalationFrequency:
        dto.rentEscalationFrequency ?? RentEscalationFrequency.NONE,
      createdBy: userId,
    });

    const leaseTenants: LeaseTenant[] = [];
    for (const t of dto.tenants) {
      const lt = await this.leaseTenantRepository.create({
        leaseId: lease.id,
        tenantId: t.tenantId,
        isPrimary: t.isPrimary ?? false,
      });
      leaseTenants.push(lt);
    }

    await this.recordVersion(lease, leaseTenants, userId, 'created');
    return toLeaseResponseDto(lease);
  }

  async list(query: ListLeasesQueryDto): Promise<{
    items: LeaseResponseDto[];
    nextCursor: string | null;
  }> {
    const limit = query.limit ?? 20;
    const { items, nextCursor } = await this.leaseRepository.listWithFilters(
      {
        status: query.status,
        propertyId: query.propertyId,
        unitId: query.unitId,
        tenantId: query.tenantId,
      },
      limit,
      query.cursor,
    );
    return { items: items.map(toLeaseResponseDto), nextCursor };
  }

  async findOne(id: string): Promise<LeaseDetailResponseDto> {
    const lease = await this.leaseRepository.findDetailById(id);
    if (!lease) {
      throw new NotFoundException('Lease not found');
    }
    const leaseTenants = await this.leaseTenantRepository.findByLeaseId(id);
    const payments = await this.tenantRepo.manager
      .getRepository(TenantPayment)
      .find({
        where: { leaseId: id, orgId: TenantContext.getOrgId() },
        order: { createdAt: 'DESC' },
      });
    return toLeaseDetailResponseDto(lease, leaseTenants, payments);
  }

  async update(id: string, dto: UpdateLeaseDto): Promise<LeaseResponseDto> {
    const lease = await this.requireLease(id);
    if (lease.status !== LeaseStatus.DRAFT) {
      throw new UnprocessableEntityException(
        'Lease can only be updated while in draft status',
      );
    }

    const updated = await this.leaseRepository.update(id, {
      ...dto,
      endDate: dto.endDate === undefined ? undefined : dto.endDate,
    });
    const tenants = await this.leaseTenantRepository.findByLeaseId(id);
    await this.recordVersion(updated, tenants, TenantContext.getUserId(), 'updated');
    return toLeaseResponseDto(updated);
  }

  async send(id: string): Promise<LeaseResponseDto> {
    const lease = await this.requireLease(id);
    this.stateMachine.assertTransition(lease.status, LeaseStatus.PENDING);
    const updated = await this.transition(id, LeaseStatus.PENDING, 'sent');
    return toLeaseResponseDto(updated);
  }

  async recall(id: string): Promise<LeaseResponseDto> {
    const lease = await this.requireLease(id);
    this.stateMachine.assertTransition(lease.status, LeaseStatus.DRAFT);
    const updated = await this.transition(id, LeaseStatus.DRAFT, 'recalled', {
      signedByTenantAt: null,
      signedByManagerAt: null,
    });
    await this.clearTenantSignatures(id);
    return toLeaseResponseDto(updated);
  }

  async sign(id: string, dto: SignLeaseDto): Promise<LeaseResponseDto> {
    const lease = await this.requireLease(id);
    if (lease.status !== LeaseStatus.PENDING) {
      throw new UnprocessableEntityException(
        'Signatures can only be recorded while lease is pending',
      );
    }

    const now = new Date();
    const patch: Partial<Lease> = {};

    if (dto.role === LeaseSignerRole.TENANT) {
      patch.signedByTenantAt = now;
      const tenants = await this.leaseTenantRepository.findByLeaseId(id);
      const primary = tenants.find((t) => t.isPrimary);
      if (primary) {
        await this.leaseTenantRepository.update(primary.id, { signedAt: now });
      }
    } else {
      patch.signedByManagerAt = now;
    }

    let updated = await this.leaseRepository.update(id, patch);
    const tenants = await this.leaseTenantRepository.findByLeaseId(id);
    await this.recordVersion(updated, tenants, TenantContext.getUserId(), 'signed');

    if (updated.signedByTenantAt && updated.signedByManagerAt) {
      this.stateMachine.assertTransition(LeaseStatus.PENDING, LeaseStatus.ACTIVE);
      updated = await this.transition(id, LeaseStatus.ACTIVE, 'activated');
      if (updated.endDate) {
        await this.expirationScheduler.scheduleExpiration(
          updated.id,
          updated.orgId,
          updated.endDate,
        );
      }
    }

    return toLeaseResponseDto(updated);
  }

  async renew(id: string): Promise<LeaseResponseDto> {
    const lease = await this.requireLease(id);
    this.stateMachine.assertTransition(lease.status, LeaseStatus.RENEWED);

    const escalatedRent = calculateEscalatedRent(
      lease.monthlyRent,
      lease.rentEscalationPercent,
      lease.rentEscalationFrequency,
    );

    const orgId = TenantContext.getOrgId();
    const userId = TenantContext.getUserId();
    const tenants = await this.leaseTenantRepository.findByLeaseId(id);

    await this.transition(id, LeaseStatus.RENEWED, 'renewed');

    const renewal = await this.leaseRepository.create({
      propertyId: lease.propertyId,
      unitId: lease.unitId,
      status: LeaseStatus.DRAFT,
      version: 1,
      startDate: lease.endDate ?? lease.startDate,
      endDate: null,
      monthlyRent: escalatedRent,
      securityDeposit: lease.securityDeposit,
      lateFeeAmount: lease.lateFeeAmount,
      lateFeeGraceDays: lease.lateFeeGraceDays,
      rentEscalationPercent: lease.rentEscalationPercent,
      rentEscalationFrequency: lease.rentEscalationFrequency,
      renewedFromLeaseId: lease.id,
      createdBy: userId,
    });

    const renewalTenants: LeaseTenant[] = [];
    for (const lt of tenants) {
      const row = await this.leaseTenantRepository.create({
        leaseId: renewal.id,
        tenantId: lt.tenantId,
        isPrimary: lt.isPrimary,
      });
      renewalTenants.push(row);
    }

    await this.recordVersion(renewal, renewalTenants, userId, 'renewal_created');
    return toLeaseResponseDto(renewal);
  }

  async terminate(id: string, dto: TerminateLeaseDto): Promise<LeaseResponseDto> {
    const lease = await this.requireLease(id);
    this.stateMachine.assertTransition(lease.status, LeaseStatus.TERMINATED);
    await this.expirationScheduler.cancelExpiration(id);
    const updated = await this.transition(id, LeaseStatus.TERMINATED, 'terminated', {
      terminatedAt: new Date(),
      terminationReason: dto.reason,
    });
    return toLeaseResponseDto(updated);
  }

  async expireLease(leaseId: string, orgId: string): Promise<void> {
    const lease = await this.leaseRepository.findByIdForOrg(leaseId, orgId);
    if (!lease || lease.status !== LeaseStatus.ACTIVE) {
      return;
    }
    const changedBy = lease.createdBy ?? lease.id;
    await TenantContext.run({ orgId, userId: changedBy }, async () => {
      this.stateMachine.assertTransition(lease.status, LeaseStatus.EXPIRED);
      await this.transition(leaseId, LeaseStatus.EXPIRED, 'expired');
    });
  }

  async listVersions(id: string): Promise<LeaseVersionResponseDto[]> {
    await this.requireLease(id);
    const versions = await this.leaseVersionRepository.findByLeaseId(id);
    return versions.map(toLeaseVersionResponseDto);
  }

  private async transition(
    id: string,
    to: LeaseStatus,
    reason: string,
    extra: Partial<Lease> = {},
  ): Promise<Lease> {
    const lease = await this.requireLease(id);
    this.stateMachine.assertTransition(lease.status, to);

    const nextVersion = lease.version + 1;
    const updated = await this.leaseRepository.update(id, {
      status: to,
      version: nextVersion,
      ...extra,
    });
    const tenants = await this.leaseTenantRepository.findByLeaseId(id);
    await this.recordVersion(
      updated,
      tenants,
      TenantContext.getUserId(),
      reason,
    );
    return updated;
  }

  private async recordVersion(
    lease: Lease,
    tenants: LeaseTenant[],
    changedBy: string,
    reason: string,
  ): Promise<void> {
    await this.leaseVersionRepository.saveSnapshot(
      lease.id,
      lease.version,
      {
        ...buildLeaseSnapshot(
          lease,
          tenants.map((t) => ({
            tenantId: t.tenantId,
            isPrimary: t.isPrimary,
            signedAt: t.signedAt,
          })),
        ),
        changeReason: reason,
      },
      changedBy,
    );
  }

  private async clearTenantSignatures(leaseId: string): Promise<void> {
    const tenants = await this.leaseTenantRepository.findByLeaseId(leaseId);
    for (const t of tenants) {
      if (t.signedAt) {
        await this.leaseTenantRepository.update(t.id, { signedAt: null });
      }
    }
  }

  private async requireLease(id: string): Promise<Lease> {
    const lease = await this.leaseRepository.findById(id);
    if (!lease) {
      throw new NotFoundException('Lease not found');
    }
    return lease;
  }
}
