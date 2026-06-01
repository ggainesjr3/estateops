import type { MaintenanceTicketStatus } from '@web/lib/api/types';

type MaintenanceTicketPriority = 'low' | 'medium' | 'high' | 'critical';
type MaintenanceTrade =
  | 'plumbing'
  | 'electrical'
  | 'hvac'
  | 'appliance'
  | 'structural'
  | 'cleaning'
  | 'landscaping'
  | 'general'
  | 'pest_control';
import {
  Bug,
  Droplets,
  Hammer,
  Leaf,
  Refrigerator,
  Sparkles,
  Wrench,
  Zap,
  type LucideIcon,
} from 'lucide-react';

export const PRIORITY_STYLES: Record<
  MaintenanceTicketPriority,
  { label: string; className: string }
> = {
  critical: {
    label: 'Critical',
    className: 'bg-red-600 text-white border-red-700',
  },
  high: {
    label: 'High',
    className: 'bg-orange-500 text-white border-orange-600',
  },
  medium: {
    label: 'Medium',
    className: 'bg-amber-400 text-amber-950 border-amber-500',
  },
  low: {
    label: 'Low',
    className: 'bg-gray-200 text-gray-800 border-gray-300',
  },
};

export const STATUS_STYLES: Record<MaintenanceTicketStatus, string> = {
  created: 'bg-slate-100 text-slate-800',
  triaged: 'bg-blue-100 text-blue-800',
  assigned: 'bg-indigo-100 text-indigo-800',
  dispatched: 'bg-violet-100 text-violet-800',
  in_progress: 'bg-amber-100 text-amber-900',
  completed: 'bg-emerald-100 text-emerald-800',
  invoiced: 'bg-cyan-100 text-cyan-800',
  closed: 'bg-gray-200 text-gray-700',
};

export const TRADE_ICONS: Record<MaintenanceTrade, LucideIcon> = {
  plumbing: Droplets,
  electrical: Zap,
  hvac: Wrench,
  appliance: Refrigerator,
  structural: Hammer,
  cleaning: Sparkles,
  landscaping: Leaf,
  general: Wrench,
  pest_control: Bug,
};

export type SlaTone = 'green' | 'amber' | 'red' | 'muted';

export function slaTone(slaDueAt: string | null, status: MaintenanceTicketStatus): SlaTone {
  if (!slaDueAt) return 'muted';
  if (
    status === 'completed' ||
    status === 'invoiced' ||
    status === 'closed' ||
    status === 'in_progress'
  ) {
    return 'green';
  }
  const ms = new Date(slaDueAt).getTime() - Date.now();
  if (ms <= 0) return 'red';
  if (ms < 4 * 60 * 60 * 1000) return 'amber';
  return 'green';
}

export const SLA_TONE_CLASS: Record<SlaTone, string> = {
  green: 'text-emerald-600',
  amber: 'text-amber-600',
  red: 'text-red-600',
  muted: 'text-muted-foreground',
};

export function formatSlaRemaining(slaDueAt: string | null): string {
  if (!slaDueAt) return '—';
  const ms = new Date(slaDueAt).getTime() - Date.now();
  if (ms <= 0) {
    const over = Math.abs(ms);
    const h = Math.floor(over / 3_600_000);
    const m = Math.floor((over % 3_600_000) / 60_000);
    return h > 0 ? `${h}h ${m}m overdue` : `${m}m overdue`;
  }
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h >= 24) {
    const d = Math.floor(h / 24);
    return `${d}d ${h % 24}h left`;
  }
  return h > 0 ? `${h}h ${m}m left` : `${m}m left`;
}
