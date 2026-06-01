import type { MaintenanceTrade } from '@web/lib/api/types';
import { TRADE_ICONS } from '@web/lib/maintenance-styles';
import { cn } from '@web/lib/utils';

export function TradeIcon({
  trade,
  className,
}: {
  trade: MaintenanceTrade;
  className?: string;
}) {
  const Icon = TRADE_ICONS[trade];
  return <Icon className={cn('h-4 w-4 text-muted-foreground', className)} aria-hidden />;
}
