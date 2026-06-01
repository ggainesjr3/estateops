import { Lease } from '../../leases/entities/lease.entity';
import { TenantEmergencyContact } from '../entities/tenant-emergency-contact.entity';
import { TenantCommunicationHistory } from '../entities/tenant-communication-history.entity';
import { TenantPayment } from '../entities/tenant-payment.entity';
import { Tenant } from '../entities/tenant.entity';
import { CommunicationHistoryResponseDto } from '../dto/communication-history-response.dto';
import {
  ActiveLeaseSummaryDto,
  EmergencyContactResponseDto,
  TenantDetailResponseDto,
  TenantResponseDto,
} from '../dto/tenant-response.dto';
import { PortalLeaseDto, PortalPaymentDto } from '../dto/portal-response.dto';

export function toTenantResponseDto(tenant: Tenant): TenantResponseDto {
  return {
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
  };
}

export function toTenantDetailResponseDto(
  tenant: Tenant,
  emergencyContacts: TenantEmergencyContact[],
  activeLease: Lease | null,
): TenantDetailResponseDto {
  return {
    ...toTenantResponseDto(tenant),
    dob: tenant.dob,
    govtIdType: tenant.govtIdType,
    govtIdLast4: tenant.govtIdLast4,
    notes: tenant.notes,
    emergencyContacts: emergencyContacts.map(toEmergencyContactResponseDto),
    activeLease: activeLease ? toActiveLeaseSummaryDto(activeLease) : null,
  };
}

export function toEmergencyContactResponseDto(
  contact: TenantEmergencyContact,
): EmergencyContactResponseDto {
  return {
    id: contact.id,
    name: contact.name,
    relationship: contact.relationship,
    phone: contact.phone,
    email: contact.email,
    isPrimary: contact.isPrimary,
  };
}

export function toActiveLeaseSummaryDto(lease: Lease): ActiveLeaseSummaryDto {
  return {
    id: lease.id,
    propertyId: lease.propertyId,
    propertyName: lease.property?.name ?? 'Unknown',
    unitId: lease.unitId,
    unitNumber: lease.unit?.unitNumber ?? 'Unknown',
    monthlyRent: parseFloat(lease.monthlyRent),
    startDate: lease.startDate,
    endDate: lease.endDate,
  };
}

export function toCommunicationHistoryResponseDto(
  record: TenantCommunicationHistory,
): CommunicationHistoryResponseDto {
  return {
    id: record.id,
    channel: record.channel,
    direction: record.direction,
    subject: record.subject,
    body: record.body,
    sentByUserId: record.sentByUserId,
    sentAt: record.sentAt.toISOString(),
  };
}

export function toPortalLeaseDto(lease: Lease): PortalLeaseDto {
  return {
    id: lease.id,
    propertyName: lease.property?.name ?? 'Unknown',
    unitNumber: lease.unit?.unitNumber ?? 'Unknown',
    monthlyRent: parseFloat(lease.monthlyRent),
    startDate: lease.startDate,
    endDate: lease.endDate,
  };
}

export function toPortalPaymentDto(payment: TenantPayment): PortalPaymentDto {
  return {
    id: payment.id,
    amount: parseFloat(payment.amount),
    status: payment.status,
    description: payment.description,
    paidAt: payment.paidAt?.toISOString() ?? null,
    createdAt: payment.createdAt.toISOString(),
  };
}
