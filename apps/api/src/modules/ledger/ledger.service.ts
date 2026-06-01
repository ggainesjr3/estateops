import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LedgerEntryType } from '@estateops/shared';
import { Repository } from 'typeorm';
import { TenantContext } from '../../tenant/tenant.context';
import { PostTransactionDto } from './dto/post-transaction.dto';
import {
  AccountBalanceResponseDto,
  GeneralLedgerLineDto,
  LedgerTransactionResponseDto,
  TrialBalanceLineDto,
} from './dto/ledger-response.dto';
import { LedgerAccount } from './entities/ledger-account.entity';
import { LedgerEntry } from './entities/ledger-entry.entity';
import { LedgerTransaction } from './entities/ledger-transaction.entity';
import {
  assertBalancedEntries,
  centsToAmount,
  parseMoneyToCents,
} from './ledger-amount.util';
import {
  applyEntryToBalanceCents,
  computeSignedBalanceCents,
  formatBalance,
} from './ledger-balance.util';
import { LedgerAccountRepository } from './repositories/ledger-account.repository';
import { LedgerTransactionRepository } from './repositories/ledger-transaction.repository';
import { SYSTEM_LEDGER_ACCOUNTS } from './system-accounts';

export interface GeneralLedgerQuery {
  from?: Date;
  to?: Date;
  limit?: number;
  cursor?: string;
}

export interface GeneralLedgerPage {
  items: GeneralLedgerLineDto[];
  nextCursor: string | null;
}

@Injectable()
export class LedgerService {
  constructor(
    private readonly accountRepository: LedgerAccountRepository,
    private readonly transactionRepository: LedgerTransactionRepository,
    @InjectRepository(LedgerEntry)
    private readonly entryRepository: Repository<LedgerEntry>,
    @InjectRepository(LedgerAccount)
    private readonly accountOrmRepository: Repository<LedgerAccount>,
  ) {}

  async ensureSystemAccounts(orgId?: string): Promise<void> {
    const resolvedOrgId = orgId ?? TenantContext.getOrgId();
    const existing = await this.accountOrmRepository.find({
      where: { orgId: resolvedOrgId, isSystem: true },
    });
    const existingCodes = new Set(existing.map((a) => a.code));

    const missing = SYSTEM_LEDGER_ACCOUNTS.filter(
      (def) => !existingCodes.has(def.code),
    );
    if (missing.length === 0) {
      return;
    }

    const rows = missing.map((def) =>
      this.accountOrmRepository.create({
        orgId: resolvedOrgId,
        name: def.name,
        code: def.code,
        type: def.type,
        subtype: def.subtype ?? null,
        isSystem: true,
      }),
    );
    await this.accountOrmRepository.save(rows);
  }

  async postTransaction(dto: PostTransactionDto): Promise<LedgerTransactionResponseDto> {
    await this.ensureSystemAccounts();

    const existing = await this.transactionRepository.findByIdempotencyKey(
      dto.idempotencyKey,
    );
    if (existing) {
      const existingEntries = await this.entryRepository.find({
        where: { transactionId: existing.id, orgId: TenantContext.getOrgId() },
      });
      return this.toTransactionResponse(existing, existingEntries);
    }

    assertBalancedEntries(dto.entries);

    const orgId = TenantContext.getOrgId();
    const userId = TenantContext.getUserId();
    const accountIds = [...new Set(dto.entries.map((e) => e.accountId))];
    const accounts = await this.accountOrmRepository.find({
      where: accountIds.map((id) => ({ id, orgId })),
    });
    if (accounts.length !== accountIds.length) {
      throw new NotFoundException('One or more ledger accounts not found');
    }

    const postedAt = dto.postedAt ? new Date(dto.postedAt) : new Date();

    const saved = await this.entryRepository.manager.transaction(async (manager) => {
      const txRepo = manager.getRepository(LedgerTransaction);
      const entryRepo = manager.getRepository(LedgerEntry);

      const transaction = txRepo.create({
        orgId,
        idempotencyKey: dto.idempotencyKey,
        description: dto.description,
        referenceType: dto.referenceType,
        referenceId: dto.referenceId ?? null,
        postedAt,
        createdBy: userId,
      });
      const persistedTx = await txRepo.save(transaction);

      const entries = dto.entries.map((line) =>
        entryRepo.create({
          orgId,
          transactionId: persistedTx.id,
          accountId: line.accountId,
          amount: line.amount,
          type: line.type,
        }),
      );
      const persistedEntries = await entryRepo.save(entries);

      const tx = await txRepo.findOneOrFail({
        where: { id: persistedTx.id },
      });
      return { tx, entries: persistedEntries };
    });

    return this.toTransactionResponse(saved.tx, saved.entries);
  }

  async getAccountBalance(
    accountId: string,
    asOf?: Date,
  ): Promise<AccountBalanceResponseDto> {
    const account = await this.accountRepository.findByIdOrFail(accountId);
    const totals = await this.sumEntriesForAccount(accountId, asOf);
    return {
      accountId,
      balance: formatBalance(account.type, totals),
    };
  }

  async getTrialBalance(orgId?: string, asOf?: Date): Promise<TrialBalanceLineDto[]> {
    const resolvedOrgId = orgId ?? TenantContext.getOrgId();
    await this.ensureSystemAccounts(resolvedOrgId);

    const accounts = await this.accountOrmRepository.find({
      where: { orgId: resolvedOrgId },
      order: { code: 'ASC' },
    });

    const lines: TrialBalanceLineDto[] = [];
    for (const account of accounts) {
      const totals = await this.sumEntriesForAccount(account.id, asOf, resolvedOrgId);
      const signed = computeSignedBalanceCents(account.type, totals);
      if (signed === 0n) {
        continue;
      }
      lines.push({
        accountId: account.id,
        code: account.code,
        name: account.name,
        type: account.type,
        balance: formatBalance(account.type, totals),
      });
    }
    return lines;
  }

  async getGeneralLedger(
    accountId: string,
    query: GeneralLedgerQuery = {},
  ): Promise<GeneralLedgerPage> {
    const account = await this.accountRepository.findByIdOrFail(accountId);
    const orgId = TenantContext.getOrgId();
    const limit = Math.min(query.limit ?? 50, 100);

    let openingTotals = { debitsCents: 0n, creditsCents: 0n };

    if (query.cursor) {
      const cursorEntry = await this.entryRepository.findOne({
        where: { id: query.cursor, orgId, accountId },
        relations: ['transaction'],
      });
      if (!cursorEntry) {
        throw new NotFoundException('Ledger cursor entry not found');
      }
      openingTotals = await this.sumEntriesBefore(accountId, cursorEntry, orgId);
    } else if (query.from) {
      openingTotals = await this.sumEntriesForAccount(
        accountId,
        new Date(query.from.getTime() - 1),
        orgId,
      );
    }

    let runningCents = computeSignedBalanceCents(account.type, openingTotals);

    const qb = this.entryRepository
      .createQueryBuilder('entry')
      .innerJoinAndSelect('entry.transaction', 'tx')
      .where('entry.org_id = :orgId', { orgId })
      .andWhere('entry.account_id = :accountId', { accountId })
      .orderBy('tx.posted_at', 'ASC')
      .addOrderBy('entry.created_at', 'ASC')
      .addOrderBy('entry.id', 'ASC');

    if (query.from) {
      qb.andWhere('tx.posted_at >= :from', { from: query.from });
    }
    if (query.to) {
      qb.andWhere('tx.posted_at <= :to', { to: query.to });
    }
    if (query.cursor) {
      qb.andWhere('entry.id > :cursor', { cursor: query.cursor });
    }

    const rows = await qb.take(limit + 1).getMany();
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;

    const items: GeneralLedgerLineDto[] = [];
    for (const entry of page) {
      runningCents = applyEntryToBalanceCents(
        account.type,
        runningCents,
        entry.type,
        entry.amount,
      );
      items.push({
        entryId: entry.id,
        transactionId: entry.transactionId,
        postedAt: entry.transaction.postedAt.toISOString(),
        description: entry.transaction.description,
        amount: entry.amount,
        type: entry.type,
        runningBalance: centsToAmount(runningCents),
      });
    }

    return {
      items,
      nextCursor: hasMore ? page[page.length - 1]!.id : null,
    };
  }

  private async sumEntriesForAccount(
    accountId: string,
    asOf?: Date,
    orgId?: string,
  ): Promise<{ debitsCents: bigint; creditsCents: bigint }> {
    const resolvedOrgId = orgId ?? TenantContext.getOrgId();
    const qb = this.entryRepository
      .createQueryBuilder('entry')
      .innerJoin('entry.transaction', 'tx')
      .select(
        `COALESCE(SUM(CASE WHEN entry.type = :debit THEN entry.amount ELSE 0 END), 0)`,
        'debitSum',
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN entry.type = :credit THEN entry.amount ELSE 0 END), 0)`,
        'creditSum',
      )
      .where('entry.org_id = :orgId', { orgId: resolvedOrgId })
      .andWhere('entry.account_id = :accountId', { accountId })
      .setParameter('debit', LedgerEntryType.DEBIT)
      .setParameter('credit', LedgerEntryType.CREDIT);

    if (asOf) {
      qb.andWhere('tx.posted_at <= :asOf', { asOf });
    }

    const raw = await qb.getRawOne<{ debitSum: string; creditSum: string }>();
    return {
      debitsCents: parseMoneyToCents(raw?.debitSum ?? '0'),
      creditsCents: parseMoneyToCents(raw?.creditSum ?? '0'),
    };
  }

  private async sumEntriesBefore(
    accountId: string,
    beforeEntry: LedgerEntry,
    orgId: string,
  ): Promise<{ debitsCents: bigint; creditsCents: bigint }> {
    const qb = this.entryRepository
      .createQueryBuilder('entry')
      .innerJoin('entry.transaction', 'tx')
      .select(
        `COALESCE(SUM(CASE WHEN entry.type = :debit THEN entry.amount ELSE 0 END), 0)`,
        'debitSum',
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN entry.type = :credit THEN entry.amount ELSE 0 END), 0)`,
        'creditSum',
      )
      .where('entry.org_id = :orgId', { orgId })
      .andWhere('entry.account_id = :accountId', { accountId })
      .andWhere(
        `(tx.posted_at < :postedAt OR (tx.posted_at = :postedAt AND entry.id < :entryId))`,
        {
          postedAt: beforeEntry.transaction.postedAt,
          entryId: beforeEntry.id,
        },
      )
      .setParameter('debit', LedgerEntryType.DEBIT)
      .setParameter('credit', LedgerEntryType.CREDIT);

    const raw = await qb.getRawOne<{ debitSum: string; creditSum: string }>();
    return {
      debitsCents: parseMoneyToCents(raw?.debitSum ?? '0'),
      creditsCents: parseMoneyToCents(raw?.creditSum ?? '0'),
    };
  }

  private toTransactionResponse(
    tx: LedgerTransaction,
    entries: LedgerEntry[],
  ): LedgerTransactionResponseDto {
    return {
      id: tx.id,
      idempotencyKey: tx.idempotencyKey,
      description: tx.description,
      referenceType: tx.referenceType,
      referenceId: tx.referenceId,
      postedAt: tx.postedAt.toISOString(),
      createdBy: tx.createdBy,
      createdAt: tx.createdAt.toISOString(),
      entries: entries.map((e) => ({
        id: e.id,
        accountId: e.accountId,
        amount: e.amount,
        type: e.type,
        createdAt: e.createdAt.toISOString(),
      })),
    };
  }
}
