import type { MaintenanceTrade } from '@web/lib/api/types';

export const VENDOR_TRADES = [
  'plumbing',
  'electrical',
  'hvac',
  'appliance',
  'structural',
  'cleaning',
  'landscaping',
  'general',
  'pest_control',
] as const satisfies readonly MaintenanceTrade[];

export const TRADE_LABELS: Record<MaintenanceTrade, string> = {
  plumbing: 'Plumbing',
  electrical: 'Electrical',
  hvac: 'HVAC',
  appliance: 'Appliance',
  structural: 'Structural',
  cleaning: 'Cleaning',
  landscaping: 'Landscaping',
  general: 'General',
  pest_control: 'Pest control',
};

export function formatTrade(trade: MaintenanceTrade): string {
  return TRADE_LABELS[trade] ?? trade.replace('_', ' ');
}
