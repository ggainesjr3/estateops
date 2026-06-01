jest.mock('typeorm', () => ({
  Repository: class Repository {},
  EntityManager: class EntityManager {},
}));
jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

jest.mock('./repositories/ledger-account.repository', () => ({
  LedgerAccountRepository: class LedgerAccountRepository {},
}));
jest.mock('./repositories/ledger-transaction.repository', () => ({
  LedgerTransactionRepository: class LedgerTransactionRepository {},
}));
jest.mock('./entities/ledger-account.entity', () => ({
  LedgerAccount: class LedgerAccount {},
}));
jest.mock('./entities/ledger-entry.entity', () => ({
  LedgerEntry: class LedgerEntry {},
}));
jest.mock('./entities/ledger-transaction.entity', () => ({
  LedgerTransaction: class LedgerTransaction {},
}));

import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  LedgerAccountType,
  LedgerEntryType,
  LedgerReferenceType,
} from '@estateops/shared';
import { runWithTenant } from '../../test/tenant-test.util';
import { LedgerService } from './ledger.service';
import { LedgerAccountRepository } from './repositories/ledger-account.repository';
import { LedgerTransactionRepository } from './repositories/ledger-transaction.repository';
import { LedgerAccount } from './entities/ledger-account.entity';
import { LedgerEntry } from './entities/ledger-entry.entity';
import { LedgerTransaction } from './entities/ledger-transaction.entity';

const orgId = '11111111-1111-1111-1111-111111111111';
const userId = '22222222-2222-2222-2222-222222222222';
const cashId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const revenueId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

describe('LedgerService', () => {
  let service: LedgerService;
  let accountRepository: {
    findByIdOrFail: jest.Mock;
    findById: jest.Mock;
  };
  let transactionRepository: {
    findByIdempotencyKey: jest.Mock;
    findByIdWithEntries: jest.Mock;
  };
  let accountOrm: {
    find: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let entryOrm: {
    manager: { transaction: jest.Mock };
    createQueryBuilder: jest.Mock;
    findOne: jest.Mock;
    find: jest.Mock;
  };

  const cashAccount: LedgerAccount = {
    id: cashId,
    orgId,
    name: 'Cash',
    code: '1000',
    type: LedgerAccountType.ASSET,
    subtype: null,
    isSystem: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as LedgerAccount;

  const revenueAccount: LedgerAccount = {
    id: revenueId,
    orgId,
    name: 'Rental Revenue',
    code: '3000',
    type: LedgerAccountType.REVENUE,
    subtype: null,
    isSystem: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as LedgerAccount;

  beforeEach(() => {
    accountRepository = {
      findByIdOrFail: jest.fn().mockImplementation(async (id: string) => {
        if (id === cashId) return cashAccount;
        if (id === revenueId) return revenueAccount;
        throw new NotFoundException();
      }),
      findById: jest.fn(),
    };

    transactionRepository = {
      findByIdempotencyKey: jest.fn().mockResolvedValue(null),
      findByIdWithEntries: jest.fn(),
    };

    accountOrm = {
      find: jest.fn(async (opts?: { where?: { isSystem?: boolean } }) => {
        if (opts?.where && 'isSystem' in opts.where) {
          return [];
        }
        return [cashAccount, revenueAccount];
      }),
      create: jest.fn((row) => row),
      save: jest.fn().mockResolvedValue([]),
    };

    const qb = {
      innerJoin: jest.fn().mockReturnThis(),
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      setParameter: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({ debitSum: '100.00', creditSum: '0.00' }),
      getMany: jest.fn().mockResolvedValue([]),
    };

    entryOrm = {
      manager: {
        transaction: jest.fn(),
      },
      createQueryBuilder: jest.fn(() => qb),
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
    };

    service = new LedgerService(
      accountRepository as unknown as LedgerAccountRepository,
      transactionRepository as unknown as LedgerTransactionRepository,
      entryOrm as never,
      accountOrm as never,
    );
  });

  const run = <T>(fn: () => Promise<T>) => runWithTenant(orgId, userId, fn);

  it('rejects unbalanced postTransaction before hitting DB', async () => {
    await run(async () => {
      await expect(
        service.postTransaction({
          idempotencyKey: 'key-1',
          description: 'Rent',
          referenceType: LedgerReferenceType.PAYMENT,
          entries: [
            { accountId: cashId, amount: '100.00', type: LedgerEntryType.DEBIT },
            { accountId: revenueId, amount: '50.00', type: LedgerEntryType.CREDIT },
          ],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
    expect(entryOrm.manager.transaction).not.toHaveBeenCalled();
  });

  it('returns existing transaction when idempotency_key duplicates', async () => {
    const existing: LedgerTransaction = {
      id: 'tx-existing',
      orgId,
      idempotencyKey: 'rent-payment-1',
      description: 'Rent payment',
      referenceType: LedgerReferenceType.PAYMENT,
      referenceId: null,
      postedAt: new Date('2026-01-15'),
      createdBy: userId,
      createdAt: new Date(),
    } as LedgerTransaction;

    const existingEntries: LedgerEntry[] = [
      {
        id: 'e1',
        orgId,
        transactionId: 'tx-existing',
        accountId: cashId,
        amount: '500.00',
        type: LedgerEntryType.DEBIT,
        createdAt: new Date(),
      } as LedgerEntry,
      {
        id: 'e2',
        orgId,
        transactionId: 'tx-existing',
        accountId: revenueId,
        amount: '500.00',
        type: LedgerEntryType.CREDIT,
        createdAt: new Date(),
      } as LedgerEntry,
    ];

    transactionRepository.findByIdempotencyKey.mockResolvedValue(existing);
    entryOrm.find.mockResolvedValue(existingEntries);

    await run(async () => {
      const result = await service.postTransaction({
        idempotencyKey: 'rent-payment-1',
        description: 'Should not repost',
        referenceType: LedgerReferenceType.PAYMENT,
        entries: [
          { accountId: cashId, amount: '1.00', type: LedgerEntryType.DEBIT },
          { accountId: revenueId, amount: '1.00', type: LedgerEntryType.CREDIT },
        ],
      });
      expect(result.id).toBe('tx-existing');
      expect(result.entries).toHaveLength(2);
    });

    expect(entryOrm.manager.transaction).not.toHaveBeenCalled();
  });

  it('posts balanced transaction in a DB transaction', async () => {
    const savedTx = {
      id: 'tx-new',
      orgId,
      idempotencyKey: 'rent-payment-2',
      description: 'Rent',
      referenceType: LedgerReferenceType.PAYMENT,
      referenceId: null,
      postedAt: new Date(),
      createdBy: userId,
      createdAt: new Date(),
      entries: [],
    } as unknown as LedgerTransaction;

    entryOrm.manager.transaction.mockImplementation(async (fn) => {
      const manager = {
        getRepository: (entity: unknown) => {
          if (entity === LedgerTransaction) {
            return {
              create: jest.fn((row) => ({ ...row, id: 'tx-new' })),
              save: jest.fn(async (row) => row),
              findOneOrFail: jest.fn().mockResolvedValue({
                ...savedTx,
                entries: [
                  {
                    id: 'e1',
                    accountId: cashId,
                    amount: '500.00',
                    type: LedgerEntryType.DEBIT,
                    createdAt: new Date(),
                  },
                  {
                    id: 'e2',
                    accountId: revenueId,
                    amount: '500.00',
                    type: LedgerEntryType.CREDIT,
                    createdAt: new Date(),
                  },
                ],
              }),
            };
          }
          return {
            create: jest.fn((row) => ({ ...row, createdAt: new Date() })),
            save: jest.fn(async (rows) => rows),
          };
        },
      };
      return fn(manager);
    });

    await run(async () => {
      const result = await service.postTransaction({
        idempotencyKey: 'rent-payment-2',
        description: 'Rent',
        referenceType: LedgerReferenceType.PAYMENT,
        entries: [
          { accountId: cashId, amount: '500.00', type: LedgerEntryType.DEBIT },
          { accountId: revenueId, amount: '500.00', type: LedgerEntryType.CREDIT },
        ],
      });
      expect(result.id).toBe('tx-new');
      expect(result.entries).toHaveLength(2);
    });

    expect(entryOrm.manager.transaction).toHaveBeenCalledTimes(1);
  });

  it('getAccountBalance computes from entry sums never stored field', async () => {
    const qb = entryOrm.createQueryBuilder();
    qb.getRawOne.mockResolvedValueOnce({ debitSum: '1500.00', creditSum: '250.50' });

    await run(async () => {
      const result = await service.getAccountBalance(cashId);
      expect(result.balance).toBe('1249.50');
    });
  });

  it('getTrialBalance returns non-zero account lines', async () => {
    const qb = entryOrm.createQueryBuilder();
    qb.getRawOne
      .mockResolvedValueOnce({ debitSum: '100.00', creditSum: '0.00' })
      .mockResolvedValueOnce({ debitSum: '0.00', creditSum: '100.00' });

    await run(async () => {
      const lines = await service.getTrialBalance();
      expect(lines).toHaveLength(2);
      expect(lines.find((l) => l.code === '1000')?.balance).toBe('100.00');
      expect(lines.find((l) => l.code === '3000')?.balance).toBe('100.00');
    });
  });

  it('ensureSystemAccounts seeds chart of accounts', async () => {
    accountOrm.find.mockResolvedValueOnce([]);
    accountOrm.save.mockResolvedValueOnce([]);

    await run(async () => {
      await service.ensureSystemAccounts();
    });

    expect(accountOrm.save).toHaveBeenCalled();
    const savedRows = accountOrm.save.mock.calls[0]![0] as unknown[];
    expect(savedRows.length).toBe(7);
  });
});
