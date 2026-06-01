import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  LedgerAccountType,
  LedgerEntryType,
  LedgerReferenceType,
} from '@estateops/shared';

export class LedgerEntryResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  accountId!: string;

  @ApiProperty()
  amount!: string;

  @ApiProperty({ enum: LedgerEntryType })
  type!: LedgerEntryType;

  @ApiProperty()
  createdAt!: string;
}

export class LedgerTransactionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  idempotencyKey!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty({ enum: LedgerReferenceType })
  referenceType!: LedgerReferenceType;

  @ApiPropertyOptional()
  referenceId?: string | null;

  @ApiProperty()
  postedAt!: string;

  @ApiProperty()
  createdBy!: string;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty({ type: [LedgerEntryResponseDto] })
  entries!: LedgerEntryResponseDto[];
}

export class AccountBalanceResponseDto {
  @ApiProperty()
  accountId!: string;

  @ApiProperty()
  balance!: string;
}

export class TrialBalanceLineDto {
  @ApiProperty()
  accountId!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: LedgerAccountType })
  type!: LedgerAccountType;

  @ApiProperty()
  balance!: string;
}

export class GeneralLedgerLineDto {
  @ApiProperty()
  entryId!: string;

  @ApiProperty()
  transactionId!: string;

  @ApiProperty()
  postedAt!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty()
  amount!: string;

  @ApiProperty({ enum: LedgerEntryType })
  type!: LedgerEntryType;

  @ApiProperty()
  runningBalance!: string;
}
