import { serverApi } from '@web/lib/api/endpoints-server';
import { LedgerPageClient } from './ledger-client';

export default async function LedgerPage() {
  let accounts: Awaited<ReturnType<typeof serverApi.accounting.ledgerAccounts>> = [];
  let serverError: string | null = null;
  try {
    accounts = await serverApi.accounting.ledgerAccounts();
  } catch (e) {
    serverError = e instanceof Error ? e.message : 'Failed to load accounts';
  }

  return <LedgerPageClient accounts={accounts} serverError={serverError} />;
}
