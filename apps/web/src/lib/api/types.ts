export type CommunicationChannel =
  | 'email'
  | 'sms'
  | 'phone'
  | 'in_person'
  | 'portal';
export type CommunicationDirection = 'inbound' | 'outbound';
export type InvoiceStatus =
  | 'draft'
  | 'sent'
  | 'partial'
  | 'paid'
  | 'void'
  | 'overdue';
export type InvoiceType =
  | 'rent'
  | 'late_fee'
  | 'security_deposit'
  | 'maintenance'
  | 'other';
export type LedgerAccountType =
  | 'asset'
  | 'liability'
  | 'equity'
  | 'revenue'
  | 'expense';
export type LedgerEntryType = 'debit' | 'credit';
export type LeaseStatus =
  | 'draft'
  | 'pending'
  | 'active'
  | 'expired'
  | 'renewed'
  | 'terminated';
export type PaymentInstrument = 'ach' | 'card' | 'check' | 'cash' | 'wire';
export type PaymentTransactionStatus =
  | 'pending'
  | 'processing'
  | 'succeeded'
  | 'failed'
  | 'refunded'
  | 'disputed';
export type PropertyStatus = 'active' | 'inactive' | 'sold';
export type PropertyType = 'residential' | 'commercial' | 'mixed_use';
export type TenantRecordStatus = 'prospect' | 'active' | 'past' | 'blacklisted';
export type UnitStatus = 'vacant' | 'occupied' | 'maintenance' | 'off_market';

export interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
  hasMore?: boolean;
}

export interface Property {
  id: string;
  orgId: string;
  name: string;
  type: PropertyType;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  status: PropertyStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface PropertySummary {
  buildingsCount: number;
  unitsCount: number;
  vacantUnits: number;
}

export interface PropertyDetail extends Property {
  summary: PropertySummary;
}

export interface PropertyListItem extends Property {
  unitsCount?: number;
  occupancyPercent?: number;
}

export interface Unit {
  id: string;
  orgId: string;
  propertyId: string;
  buildingId: string | null;
  floorNumber: number | null;
  unitNumber: string;
  type: string;
  sqft: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  status: UnitStatus;
  monthlyRent: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface Tenant {
  id: string;
  orgId: string;
  userId: string | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  status: TenantRecordStatus;
  createdAt: string;
  updatedAt: string;
}

export interface TenantListItem extends Tenant {
  activeUnitLabel?: string | null;
  activeLeaseId?: string | null;
  leaseEndDate?: string | null;
}

export interface EmergencyContact {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  email: string | null;
  isPrimary: boolean;
}

export interface ActiveLeaseSummary {
  id: string;
  propertyId: string;
  propertyName: string;
  unitId: string;
  unitNumber: string;
  monthlyRent: number;
  startDate: string;
  endDate: string | null;
}

export interface TenantDetail extends Tenant {
  dob: string | null;
  govtIdType: string | null;
  govtIdLast4: string | null;
  notes: string | null;
  emergencyContacts: EmergencyContact[];
  activeLease: ActiveLeaseSummary | null;
}

export interface CommunicationRecord {
  id: string;
  channel: CommunicationChannel;
  direction: CommunicationDirection;
  subject: string | null;
  body: string;
  sentByUserId: string | null;
  sentAt: string;
}

export interface LeaseTenantRow {
  id: string;
  tenantId: string;
  isPrimary: boolean;
  signedAt?: string | null;
  tenantName?: string;
}

export interface Lease {
  id: string;
  propertyId: string;
  unitId: string;
  status: LeaseStatus;
  version: number;
  startDate: string;
  endDate: string | null;
  monthlyRent: string;
  securityDeposit?: string | null;
  lateFeeAmount?: string | null;
  lateFeeGraceDays: number;
  rentEscalationPercent: string;
  rentEscalationFrequency: string;
  signedByTenantAt?: string | null;
  signedByManagerAt?: string | null;
  terminatedAt?: string | null;
  terminationReason?: string | null;
  renewedFromLeaseId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LeaseListItem extends Lease {
  tenantLabel?: string;
  unitLabel?: string;
}

export interface LeaseDetail extends Lease {
  tenants: LeaseTenantRow[];
  paymentHistory: {
    id: string;
    amount: string;
    status: string;
    description?: string | null;
    paidAt?: string | null;
    createdAt: string;
  }[];
}

export interface LeaseVersion {
  id: string;
  version: number;
  snapshot: Record<string, unknown>;
  changedBy: string;
  createdAt: string;
}

export interface AccountingDashboardMetrics {
  rentCollectedMtd: string;
  outstandingReceivables: string;
  securityDepositsHeld: string;
  maintenanceExpenseMtd: string;
}

export interface MonthlyRevenueExpense {
  month: string;
  revenue: string;
  expense: string;
}

export interface PropertyCollectionRate {
  propertyId: string;
  propertyName: string;
  collectionRatePercent: number;
}

export interface InvoiceSummary {
  id: string;
  invoiceNumber: string;
  tenantName: string;
  unitLabel?: string;
  type: InvoiceType;
  amountDue: string;
  amountPaid: string;
  status: InvoiceStatus;
  dueDate: string;
  paidAt?: string | null;
  daysOverdue?: number;
}

export interface PaymentSummary {
  id: string;
  amount: string;
  status: PaymentTransactionStatus;
  method: PaymentInstrument;
  processedAt?: string | null;
  createdAt: string;
}

export interface LedgerEntryLine {
  accountCode: string;
  accountName: string;
  amount: string;
  type: LedgerEntryType;
}

export interface InvoiceDetail extends InvoiceSummary {
  leaseId: string;
  tenantId: string;
  propertyName?: string;
  notes?: string | null;
  payments: PaymentSummary[];
  ledgerEntries: LedgerEntryLine[];
}

export interface AccountingDashboard {
  metrics: AccountingDashboardMetrics;
  monthlyRevenueExpense: MonthlyRevenueExpense[];
  collectionByProperty: PropertyCollectionRate[];
  recentPaidInvoices: InvoiceSummary[];
  overdueInvoices: InvoiceSummary[];
}

export interface LedgerAccountOption {
  id: string;
  code: string;
  name: string;
  type: LedgerAccountType;
}

export interface GeneralLedgerLine {
  entryId: string;
  transactionId: string;
  postedAt: string;
  description: string;
  amount: string;
  type: LedgerEntryType;
  runningBalance: string;
}

export interface TrialBalanceRow {
  accountId: string;
  code: string;
  name: string;
  type: LedgerAccountType;
  debit: string;
  credit: string;
}

export interface TrialBalanceResponse {
  rows: TrialBalanceRow[];
  totalDebit: string;
  totalCredit: string;
  balanced: boolean;
  asOf?: string;
}

export interface RentRollRow {
  propertyId: string;
  propertyName: string;
  unitId: string;
  unitNumber: string;
  tenantName: string | null;
  leaseEndDate: string | null;
  monthlyRent: string;
  lastPaymentDate: string | null;
  status: string;
}

export type MaintenanceTicketPriority = 'low' | 'medium' | 'high' | 'critical';
export type MaintenanceTicketStatus =
  | 'created'
  | 'triaged'
  | 'assigned'
  | 'dispatched'
  | 'in_progress'
  | 'completed'
  | 'invoiced'
  | 'closed';
export type MaintenanceTrade =
  | 'plumbing'
  | 'electrical'
  | 'hvac'
  | 'appliance'
  | 'structural'
  | 'cleaning'
  | 'landscaping'
  | 'general'
  | 'pest_control';

export interface MaintenanceAiClassification {
  priority?: MaintenanceTicketPriority;
  trade?: MaintenanceTrade;
  summary?: string;
  confidence?: number;
  reasoning?: string;
  source?: string;
  classifiedAt?: string;
}

export interface MaintenanceTicket {
  id: string;
  propertyId: string;
  unitId: string | null;
  tenantId: string | null;
  title: string;
  description: string | null;
  priority: MaintenanceTicketPriority;
  status: MaintenanceTicketStatus;
  trade: MaintenanceTrade;
  aiClassification: MaintenanceAiClassification | null;
  assignedVendorId: string | null;
  assignedStaffId: string | null;
  slaDueAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  invoicedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MaintenanceTicketListItem extends MaintenanceTicket {
  propertyName?: string;
  vendorName?: string;
}

export interface TicketUpdate {
  id: string;
  statusFrom: MaintenanceTicketStatus | null;
  statusTo: MaintenanceTicketStatus;
  note: string | null;
  updatedByUserId: string | null;
  createdAt: string;
}

export interface TicketAttachment {
  id: string;
  fileName: string;
  fileSize: string;
  mimeType: string;
  storageUrl: string;
  storageProvider: string;
  uploadedBy: string | null;
  createdAt: string;
}

export interface VendorInvoice {
  id: string;
  ticketId: string;
  vendorId: string;
  vendorName: string | null;
  amount: string;
  status: 'pending' | 'approved' | 'paid';
  dueDate: string;
  approvedBy: string | null;
  paidAt: string | null;
  createdAt: string;
}

export interface MaintenanceTicketDetail extends MaintenanceTicket {
  updates: TicketUpdate[];
  attachments: TicketAttachment[];
  vendorInvoices: VendorInvoice[];
}

export interface Vendor {
  id: string;
  name: string;
  trades: MaintenanceTrade[];
  email: string | null;
  phone: string | null;
  licenseNumber: string | null;
  insuranceExpiry: string | null;
  rating: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VendorListItem extends Vendor {
  activeTicketCount?: number;
  insuranceStatus?: 'valid' | 'expiring' | 'expired' | 'unknown';
}

export interface DocumentUploadUrl {
  uploadUrl: string;
  expiresAt: string;
  provider: string;
  folderPath: string;
  fileName: string;
}

export interface DocumentDownloadUrl {
  downloadUrl: string;
  expiresAt: string;
}

export interface DocumentRecord {
  id: string;
  entityType: string;
  entityId: string;
  fileName: string;
  fileSize: string;
  mimeType: string;
  folderPath: string;
  sharepointItemId: string | null;
  sharepointWebUrl: string | null;
  storageProvider: string;
  createdAt: string;
}
