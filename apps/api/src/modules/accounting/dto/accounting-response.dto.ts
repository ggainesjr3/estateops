import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  InvoiceStatus,
  InvoiceType,
  LedgerAccountType,
  LedgerEntryType,
  PaymentInstrument,
  PaymentTransactionStatus,
} from '@estateops/shared';

export class AccountingDashboardMetricsDto {
  @ApiProperty()
  rentCollectedMtd!: string;

  @ApiProperty()
  outstandingReceivables!: string;

  @ApiProperty()
  securityDepositsHeld!: string;

  @ApiProperty()
  maintenanceExpenseMtd!: string;
}

export class MonthlyRevenueExpenseDto {
  @ApiProperty()
  month!: string;

  @ApiProperty()
  revenue!: string;

  @ApiProperty()
  expense!: string;
}

export class PropertyCollectionRateDto {
  @ApiProperty()
  propertyId!: string;

  @ApiProperty()
  propertyName!: string;

  @ApiProperty()
  collectionRatePercent!: number;
}

export class InvoiceSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  invoiceNumber!: string;

  @ApiProperty()
  tenantName!: string;

  @ApiPropertyOptional()
  unitLabel?: string;

  @ApiProperty({ enum: InvoiceType })
  type!: InvoiceType;

  @ApiProperty()
  amountDue!: string;

  @ApiProperty()
  amountPaid!: string;

  @ApiProperty({ enum: InvoiceStatus })
  status!: InvoiceStatus;

  @ApiProperty()
  dueDate!: string;

  @ApiPropertyOptional()
  paidAt?: string | null;

  @ApiPropertyOptional()
  daysOverdue?: number;
}

export class PaymentSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  amount!: string;

  @ApiProperty({ enum: PaymentTransactionStatus })
  status!: PaymentTransactionStatus;

  @ApiProperty({ enum: PaymentInstrument })
  method!: PaymentInstrument;

  @ApiPropertyOptional()
  processedAt?: string | null;

  @ApiProperty()
  createdAt!: string;
}

export class LedgerEntryLineDto {
  @ApiProperty()
  accountCode!: string;

  @ApiProperty()
  accountName!: string;

  @ApiProperty()
  amount!: string;

  @ApiProperty({ enum: LedgerEntryType })
  type!: LedgerEntryType;
}

export class InvoiceDetailDto extends InvoiceSummaryDto {
  @ApiProperty()
  leaseId!: string;

  @ApiProperty()
  tenantId!: string;

  @ApiPropertyOptional()
  propertyName?: string;

  @ApiPropertyOptional()
  notes?: string | null;

  @ApiProperty({ type: [PaymentSummaryDto] })
  payments!: PaymentSummaryDto[];

  @ApiProperty({ type: [LedgerEntryLineDto] })
  ledgerEntries!: LedgerEntryLineDto[];
}

export class LedgerAccountDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: LedgerAccountType })
  type!: LedgerAccountType;
}

export class TrialBalanceRowDto {
  @ApiProperty()
  accountId!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: LedgerAccountType })
  type!: LedgerAccountType;

  @ApiProperty()
  debit!: string;

  @ApiProperty()
  credit!: string;
}

export class TrialBalanceResponseDto {
  @ApiProperty({ type: [TrialBalanceRowDto] })
  rows!: TrialBalanceRowDto[];

  @ApiProperty()
  totalDebit!: string;

  @ApiProperty()
  totalCredit!: string;

  @ApiProperty()
  balanced!: boolean;

  @ApiPropertyOptional()
  asOf?: string;
}

export class RentRollRowDto {
  @ApiProperty()
  propertyId!: string;

  @ApiProperty()
  propertyName!: string;

  @ApiProperty()
  unitId!: string;

  @ApiProperty()
  unitNumber!: string;

  @ApiPropertyOptional()
  tenantName!: string | null;

  @ApiPropertyOptional()
  leaseEndDate!: string | null;

  @ApiProperty()
  monthlyRent!: string;

  @ApiPropertyOptional()
  lastPaymentDate!: string | null;

  @ApiProperty()
  status!: string;
}

export class AccountingDashboardDto {
  @ApiProperty({ type: AccountingDashboardMetricsDto })
  metrics!: AccountingDashboardMetricsDto;

  @ApiProperty({ type: [MonthlyRevenueExpenseDto] })
  monthlyRevenueExpense!: MonthlyRevenueExpenseDto[];

  @ApiProperty({ type: [PropertyCollectionRateDto] })
  collectionByProperty!: PropertyCollectionRateDto[];

  @ApiProperty({ type: [InvoiceSummaryDto] })
  recentPaidInvoices!: InvoiceSummaryDto[];

  @ApiProperty({ type: [InvoiceSummaryDto] })
  overdueInvoices!: InvoiceSummaryDto[];
}
