import type { LeaseStatus, PropertyType, TenantRecordStatus } from '../enums';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: TenantRecordStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Property {
  id: string;
  tenantId: string;
  name: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  type: PropertyType;
  unitCount: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface HealthCheckResponse {
  status: 'ok' | 'degraded' | 'down';
  service: string;
  timestamp: string;
}

export type { JwtAccessPayload } from './auth';
export type {
  CommunicationChannel,
  CommunicationDirection,
  GovtIdType,
  LeaseSignerRole,
  LeaseStatus,
  RentEscalationFrequency,
  PaymentStatus,
  PropertyStatus,
  PropertyType,
  TenantRecordStatus,
  UnitStatus,
  UnitType,
} from '../enums';
