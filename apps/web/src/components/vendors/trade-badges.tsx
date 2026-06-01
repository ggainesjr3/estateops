import { Badge } from '@web/components/ui/badge';
import type { MaintenanceTrade } from '@web/lib/api/types';
import { formatTrade } from '@web/lib/vendor-trades';

export function TradeBadges({ trades }: { trades: MaintenanceTrade[] }) {
  if (!trades.length) {
    return <span className="text-muted-foreground text-sm">—</span>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {trades.map((trade) => (
        <Badge key={trade} variant="secondary" className="font-normal">
          {formatTrade(trade)}
        </Badge>
      ))}
    </div>
  );
}
