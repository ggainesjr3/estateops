import { Card, CardContent, CardHeader, CardTitle } from '@web/components/ui/card';
import { Skeleton } from '@web/components/ui/skeleton';
import { formatUsd } from '@web/lib/format-currency';

export function MetricCard({
  title,
  value,
  loading,
}: {
  title: string;
  value: string;
  loading?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-32" />
        ) : (
          <p className="text-2xl font-semibold tabular-nums">{formatUsd(value)}</p>
        )}
      </CardContent>
    </Card>
  );
}
