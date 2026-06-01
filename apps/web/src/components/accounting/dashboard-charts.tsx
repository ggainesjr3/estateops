'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@web/components/ui/card';
import type { MonthlyRevenueExpense, PropertyCollectionRate } from '@web/lib/api/types';
import { formatUsd } from '@web/lib/format-currency';

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border bg-card px-3 py-2 text-sm shadow">
      <p className="font-medium mb-1">{label ? formatMonthTick(label) : ''}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {formatUsd(String(p.value))}
        </p>
      ))}
    </div>
  );
}

function lastTwelveMonths(): string[] {
  const now = new Date();
  const months: string[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    months.push(
      `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`,
    );
  }
  return months;
}

const MONTH_ABBR = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function formatMonthTick(month: string): string {
  const [year, mm] = month.split('-');
  const idx = Number(mm) - 1;
  if (Number.isNaN(idx) || idx < 0 || idx > 11) return month;
  return `${MONTH_ABBR[idx]} '${(year ?? '').slice(2)}`;
}

export function RevenueExpenseChart({ data }: { data: MonthlyRevenueExpense[] }) {
  const byMonth = new Map((data ?? []).map((d) => [d.month, d]));
  const chartData = lastTwelveMonths().map((month) => {
    const d = byMonth.get(month);
    return {
      month,
      revenue: d ? parseFloat(d.revenue) : 0,
      expense: d ? parseFloat(d.expense) : 0,
    };
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Revenue vs expense (12 months)</CardTitle>
      </CardHeader>
      <CardContent className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="month" tickFormatter={formatMonthTick} tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v / 1000}k`} />
            <Tooltip content={<ChartTooltip />} />
            <Legend />
            <Bar dataKey="revenue" name="Revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expense" name="Expense" fill="hsl(0 72% 51%)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function CollectionRateChart({ data }: { data: PropertyCollectionRate[] }) {
  const chartData = data.map((d) => ({
    name: d.propertyName.length > 18 ? `${d.propertyName.slice(0, 16)}…` : d.propertyName,
    rate: d.collectionRatePercent,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Rent collection rate by property</CardTitle>
      </CardHeader>
      <CardContent className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
            <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
            <Tooltip
              formatter={(value: number) => [`${value.toFixed(1)}%`, 'Collection']}
            />
            <Bar dataKey="rate" name="Collection %" fill="hsl(142 76% 36%)" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
