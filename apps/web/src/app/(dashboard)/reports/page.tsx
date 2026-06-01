import Link from 'next/link';
import {
  AlertTriangle,
  BarChart3,
  Building2,
  ClipboardList,
  DollarSign,
} from 'lucide-react';
import { PageHeader } from '@web/components/shared/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@web/components/ui/card';

const reports = [
  {
    href: '/reports/occupancy',
    title: 'Occupancy',
    description: 'Unit occupancy rates by property and monthly trend over the last 12 months.',
    icon: Building2,
  },
  {
    href: '/reports/revenue',
    title: 'Revenue',
    description: 'Invoiced vs collected amounts, collection rate, and property breakdown.',
    icon: DollarSign,
  },
  {
    href: '/reports/maintenance',
    title: 'Maintenance',
    description: 'Ticket volume, resolution times, SLA breaches, and trade breakdown.',
    icon: BarChart3,
  },
  {
    href: '/reports/rent-roll',
    title: 'Rent roll',
    description: 'Active leases as of a date with rent, balance, and payment status.',
    icon: ClipboardList,
  },
  {
    href: '/reports/delinquency',
    title: 'Delinquency',
    description: 'Tenants with outstanding balances and days past due.',
    icon: AlertTriangle,
  },
];

export default function ReportsHomePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Operational and financial reports for your portfolio."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {reports.map(({ href, title, description, icon: Icon }) => (
          <Link key={href} href={href} className="block h-full">
            <Card className="h-full transition-colors hover:bg-muted/40">
              <CardHeader>
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <CardTitle className="text-base">{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
              <CardContent>
                <span className="text-sm font-medium text-primary">View report →</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
