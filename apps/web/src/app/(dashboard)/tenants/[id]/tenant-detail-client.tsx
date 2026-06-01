'use client';

import { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { ArrowLeft, Mail, Phone } from 'lucide-react';
import { CommunicationTimeline } from '@web/components/tenants/communication-timeline';
import { EditTenantDialog } from '@web/components/tenants/edit-tenant-dialog';
import { LogCommunicationDialog } from '@web/components/tenants/log-communication-dialog';
import { TenantAvatar } from '@web/components/tenants/tenant-avatar';
import { TenantDocumentsList } from '@web/components/tenants/tenant-documents-list';
import { TenantInvoicesTab } from '@web/components/tenants/tenant-invoices-tab';
import { TenantStatusBadge } from '@web/components/tenants/tenant-status-badge';
import { Button } from '@web/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@web/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@web/components/ui/tabs';
import type { TenantDetail } from '@web/lib/api/types';
import {
  useTenant,
  useTenantCommunication,
  useTenantDocuments,
} from '@web/lib/queries/use-tenants';

export function TenantDetailClient({ tenant: initialTenant }: { tenant: TenantDetail }) {
  const { data: tenant = initialTenant } = useTenant(initialTenant.id, initialTenant);
  const { data: comms, isLoading: commsLoading } = useTenantCommunication(tenant.id);
  const { data: documents, isLoading: docsLoading } = useTenantDocuments(tenant.id);

  const [editOpen, setEditOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);

  const lease = tenant.activeLease;

  return (
    <div className="space-y-6">
      <Link
        href="/tenants"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Tenants
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
          <TenantAvatar firstName={tenant.firstName} lastName={tenant.lastName} />
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                {tenant.firstName} {tenant.lastName}
              </h1>
              <TenantStatusBadge status={tenant.status} />
            </div>
            <div className="flex flex-col gap-1 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0" />
                <a href={`mailto:${tenant.email}`} className="hover:text-foreground hover:underline">
                  {tenant.email}
                </a>
              </span>
              {tenant.phone ? (
                <span className="inline-flex items-center gap-2">
                  <Phone className="h-4 w-4 shrink-0" />
                  <a href={`tel:${tenant.phone}`} className="hover:text-foreground hover:underline">
                    {tenant.phone}
                  </a>
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <Phone className="h-4 w-4 shrink-0" />
                  No phone on file
                </span>
              )}
            </div>
          </div>
        </div>
        <Button type="button" variant="outline" onClick={() => setEditOpen(true)}>
          Edit
        </Button>
      </div>

      {tenant.notes && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{tenant.notes}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Active lease</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {lease ? (
              <div className="space-y-2">
                <p className="font-medium">
                  {lease.propertyName} · Unit {lease.unitNumber}
                </p>
                <p>${lease.monthlyRent.toLocaleString()}/mo</p>
                <p className="text-muted-foreground">
                  {format(new Date(lease.startDate), 'MMM d, yyyy')}
                  {lease.endDate
                    ? ` – ${format(new Date(lease.endDate), 'MMM d, yyyy')}`
                    : ' – ongoing'}
                </p>
                <Link
                  href={`/leases/${lease.id}`}
                  className="inline-block font-medium text-primary hover:underline"
                >
                  View lease
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-muted-foreground">No active lease</p>
                <Link href="/leases" className="font-medium text-primary hover:underline">
                  Create a lease
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Emergency contacts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {tenant.emergencyContacts.length === 0 ? (
              <p className="text-sm text-muted-foreground">None on file.</p>
            ) : (
              tenant.emergencyContacts.map((c) => (
                <div key={c.id} className="border-b pb-3 text-sm last:border-0 last:pb-0">
                  <p className="font-medium">
                    {c.name}
                    {c.isPrimary && (
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        Primary
                      </span>
                    )}
                  </p>
                  <p className="text-muted-foreground">{c.relationship}</p>
                  <p>{c.phone}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="communication">
        <TabsList>
          <TabsTrigger value="communication">Communication</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
        </TabsList>

        <TabsContent value="communication" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button type="button" onClick={() => setLogOpen(true)}>
              Log communication
            </Button>
          </div>
          <CommunicationTimeline items={comms} isLoading={commsLoading} />
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <TenantDocumentsList documents={documents} isLoading={docsLoading} />
        </TabsContent>

        <TabsContent value="invoices" className="mt-4">
          <TenantInvoicesTab tenantId={tenant.id} />
        </TabsContent>
      </Tabs>

      <EditTenantDialog tenant={tenant} open={editOpen} onOpenChange={setEditOpen} />
      <LogCommunicationDialog tenantId={tenant.id} open={logOpen} onOpenChange={setLogOpen} />
    </div>
  );
}
