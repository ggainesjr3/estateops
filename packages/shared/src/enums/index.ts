export enum TenantRecordStatus {
  PROSPECT = 'prospect',
  ACTIVE = 'active',
  PAST = 'past',
  BLACKLISTED = 'blacklisted',
}

export enum GovtIdType {
  DRIVERS_LICENSE = 'drivers_license',
  PASSPORT = 'passport',
  STATE_ID = 'state_id',
  OTHER = 'other',
}

export enum CommunicationChannel {
  EMAIL = 'email',
  SMS = 'sms',
  PHONE = 'phone',
  IN_PERSON = 'in_person',
  PORTAL = 'portal',
}

export enum CommunicationDirection {
  INBOUND = 'inbound',
  OUTBOUND = 'outbound',
}

/** Legacy tenant_payments table status. */
export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
}

export enum InvoiceType {
  RENT = 'rent',
  LATE_FEE = 'late_fee',
  SECURITY_DEPOSIT = 'security_deposit',
  MAINTENANCE = 'maintenance',
  OTHER = 'other',
}

export enum InvoiceStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  PARTIAL = 'partial',
  PAID = 'paid',
  VOID = 'void',
  OVERDUE = 'overdue',
}

export enum PaymentMethodType {
  ACH = 'ach',
  CARD = 'card',
}

export enum PaymentTransactionStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  DISPUTED = 'disputed',
}

export enum PaymentInstrument {
  ACH = 'ach',
  CARD = 'card',
  CHECK = 'check',
  CASH = 'cash',
  WIRE = 'wire',
}

export enum PropertyType {
  RESIDENTIAL = 'residential',
  COMMERCIAL = 'commercial',
  MIXED_USE = 'mixed_use',
}

export enum PropertyStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SOLD = 'sold',
}

export enum UnitType {
  STUDIO = 'studio',
  ONE_BR = '1br',
  TWO_BR = '2br',
  THREE_BR = '3br',
  FOUR_BR_PLUS = '4br_plus',
  COMMERCIAL = 'commercial',
  STORAGE = 'storage',
}

export enum UnitStatus {
  VACANT = 'vacant',
  OCCUPIED = 'occupied',
  MAINTENANCE = 'maintenance',
  OFF_MARKET = 'off_market',
}

export enum LeaseStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  ACTIVE = 'active',
  EXPIRED = 'expired',
  RENEWED = 'renewed',
  TERMINATED = 'terminated',
}

export enum RentEscalationFrequency {
  NONE = 'none',
  ANNUAL = 'annual',
  BIANNUAL = 'biannual',
}

export enum LeaseSignerRole {
  TENANT = 'tenant',
  MANAGER = 'manager',
}

export enum OrganizationPlan {
  STARTER = 'starter',
  PRO = 'pro',
  ENTERPRISE = 'enterprise',
}

export enum AuthProviderType {
  GOOGLE = 'google',
  EMAIL = 'email',
}

export enum LedgerAccountType {
  ASSET = 'asset',
  LIABILITY = 'liability',
  EQUITY = 'equity',
  REVENUE = 'revenue',
  EXPENSE = 'expense',
}

export enum LedgerEntryType {
  DEBIT = 'debit',
  CREDIT = 'credit',
}

export enum LedgerReferenceType {
  PAYMENT = 'payment',
  INVOICE = 'invoice',
  REFUND = 'refund',
  JOURNAL_ENTRY = 'journal_entry',
  SECURITY_DEPOSIT = 'security_deposit',
  LATE_FEE = 'late_fee',
}

export enum MembershipRole {
  SUPER_ADMIN = 'super_admin',
  ORG_ADMIN = 'org_admin',
  PROPERTY_MANAGER = 'property_manager',
  ACCOUNTANT = 'accountant',
  MAINTENANCE_STAFF = 'maintenance_staff',
  VENDOR = 'vendor',
  TENANT = 'tenant',
  READ_ONLY = 'read_only',
}

export enum MaintenanceTicketPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum MaintenanceTicketStatus {
  CREATED = 'created',
  TRIAGED = 'triaged',
  ASSIGNED = 'assigned',
  DISPATCHED = 'dispatched',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  INVOICED = 'invoiced',
  CLOSED = 'closed',
}

export enum MaintenanceTrade {
  PLUMBING = 'plumbing',
  ELECTRICAL = 'electrical',
  HVAC = 'hvac',
  APPLIANCE = 'appliance',
  STRUCTURAL = 'structural',
  CLEANING = 'cleaning',
  LANDSCAPING = 'landscaping',
  GENERAL = 'general',
  PEST_CONTROL = 'pest_control',
}

export enum TicketAttachmentStorageProvider {
  SHAREPOINT = 'sharepoint',
  S3 = 's3',
}

export enum VendorInvoiceStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  PAID = 'paid',
}

export enum DocumentEntityType {
  LEASE = 'lease',
  MAINTENANCE_TICKET = 'maintenance_ticket',
  TENANT = 'tenant',
  MEETING = 'meeting',
  FINANCIAL = 'financial',
}

export enum DocumentStorageProvider {
  SHAREPOINT = 'sharepoint',
  S3 = 's3',
}

export enum NotificationChannel {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
  IN_APP = 'in_app',
}

export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  READ = 'read',
}

export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  EMERGENCY = 'emergency',
}

/** Built-in template names (org_id null on template row). */
export enum SystemNotificationTemplateName {
  LEASE_SIGNED = 'lease-signed',
  RENT_DUE = 'rent-due',
  PAYMENT_RECEIVED = 'payment-received',
  MAINTENANCE_UPDATE = 'maintenance-update',
  MAINTENANCE_ASSIGNED = 'maintenance-assigned',
  LATE_FEE_APPLIED = 'late-fee-applied',
  LEASE_EXPIRY_WARNING_30D = 'lease-expiry-warning-30d',
  LEASE_EXPIRY_WARNING_7D = 'lease-expiry-warning-7d',
  WELCOME = 'welcome',
}

export enum PushSubscriptionPlatform {
  WEB = 'web',
  EXPO = 'expo',
}

export enum MeetingArchiveStatus {
  RECEIVED = 'received',
  PROCESSING = 'processing',
  UPLOADED = 'uploaded',
  SUMMARIZED = 'summarized',
  FAILED = 'failed',
}
