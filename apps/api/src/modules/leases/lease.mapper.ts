import { Lease } from './entities/lease.entity';
import { LeaseTenant } from './entities/lease-tenant.entity';
import { LeaseVersion } from './entities/lease-version.entity';
import { TenantPayment } from '../tenants/entities/tenant-payment.entity';
import {
  LeaseDetailResponseDto,
  LeaseResponseDto,
  LeaseTenantResponseDto,
  LeaseVersionResponseDto,
  LeasePaymentResponseDto,
} from './dto/lease-response.dto';

export function toLeaseResponseDto(lease: Lease): LeaseResponseDto {
  return {
    id: lease.id,
    propertyId: lease.propertyId,
    unitId: lease.unitId,
    status: lease.status,
    version: lease.version,
    startDate: lease.startDate,
    endDate: lease.endDate,
    monthlyRent: lease.monthlyRent,
    securityDeposit: lease.securityDeposit,
    lateFeeAmount: lease.lateFeeAmount,
    lateFeeGraceDays: lease.lateFeeGraceDays,
    rentEscalationPercent: lease.rentEscalationPercent,
    rentEscalationFrequency: lease.rentEscalationFrequency,
    signedByTenantAt: lease.signedByTenantAt?.toISOString() ?? null,
    signedByManagerAt: lease.signedByManagerAt?.toISOString() ?? null,
    terminatedAt: lease.terminatedAt?.toISOString() ?? null,
    terminationReason: lease.terminationReason,
    renewedFromLeaseId: lease.renewedFromLeaseId,
    createdAt: lease.createdAt.toISOString(),
    updatedAt: lease.updatedAt.toISOString(),
  };
}

export function toLeaseDetailResponseDto(
  lease: Lease,
  leaseTenants: LeaseTenant[] = [],
  payments: TenantPayment[] = [],
): LeaseDetailResponseDto {
  const base = toLeaseResponseDto(lease);
  return {
    ...base,
    tenants: leaseTenants.map(
      (lt): LeaseTenantResponseDto => ({
        id: lt.id,
        tenantId: lt.tenantId,
        isPrimary: lt.isPrimary,
        signedAt: lt.signedAt?.toISOString() ?? null,
        tenantName: lt.tenant
          ? `${lt.tenant.firstName} ${lt.tenant.lastName}`
          : undefined,
      }),
    ),
    paymentHistory: payments.map(
      (p): LeasePaymentResponseDto => ({
        id: p.id,
        amount: p.amount,
        status: p.status,
        description: p.description,
        paidAt: p.paidAt?.toISOString() ?? null,
        createdAt: p.createdAt.toISOString(),
      }),
    ),
  };
}

export function toLeaseVersionResponseDto(v: LeaseVersion): LeaseVersionResponseDto {
  return {
    id: v.id,
    version: v.version,
    snapshot: v.snapshot,
    changedBy: v.changedBy,
    createdAt: v.createdAt.toISOString(),
  };
}

export function buildLeaseSnapshot(
  lease: Lease,
  tenantRows: { tenantId: string; isPrimary: boolean; signedAt: Date | null }[],
): Record<string, unknown> {
  return {
    id: lease.id,
    status: lease.status,
    version: lease.version,
    propertyId: lease.propertyId,
    unitId: lease.unitId,
    startDate: lease.startDate,
    endDate: lease.endDate,
    monthlyRent: lease.monthlyRent,
    securityDeposit: lease.securityDeposit,
    lateFeeAmount: lease.lateFeeAmount,
    lateFeeGraceDays: lease.lateFeeGraceDays,
    rentEscalationPercent: lease.rentEscalationPercent,
    rentEscalationFrequency: lease.rentEscalationFrequency,
    signedByTenantAt: lease.signedByTenantAt,
    signedByManagerAt: lease.signedByManagerAt,
    terminatedAt: lease.terminatedAt,
    terminationReason: lease.terminationReason,
    renewedFromLeaseId: lease.renewedFromLeaseId,
    tenants: tenantRows,
  };
}
