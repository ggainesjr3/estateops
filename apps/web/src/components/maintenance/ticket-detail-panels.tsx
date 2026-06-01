'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Star } from 'lucide-react';
import { Button } from '@web/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@web/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@web/components/ui/select';
import { Input } from '@web/components/ui/input';
import { Label } from '@web/components/ui/label';
import type {
  MaintenanceAiClassification,
  MaintenanceTicketDetail,
  MaintenanceTicketStatus,
  Vendor,
  VendorInvoice,
} from '@web/lib/api/types';
import {
  allowedTargets,
  requiresReopenNote,
  STATUS_LABELS,
} from '@web/lib/maintenance-state-machine';
import { formatUsd } from '@web/lib/format-currency';
import { PriorityBadge } from './priority-badge';
import { StatusBadge } from './status-badge';
import { SlaIndicator } from './sla-indicator';
import { TradeIcon } from './trade-icon';

export function TicketActionButtons({
  ticket,
  onTransition,
  loading,
}: {
  ticket: MaintenanceTicketDetail;
  onTransition: (status: MaintenanceTicketStatus, note?: string) => void;
  loading?: boolean;
}) {
  const [note, setNote] = useState('');
  const targets = allowedTargets(ticket.status);

  if (!targets.length) {
    return <p className="text-sm text-muted-foreground">No further transitions.</p>;
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
      {targets.map((status) => (
        <Button
          key={status}
          variant={status === 'created' ? 'outline' : 'default'}
          size="sm"
          disabled={loading}
          onClick={() =>
            onTransition(
              status,
              requiresReopenNote(ticket.status, status) ? note || 'Reopened' : undefined,
            )
          }
        >
          → {STATUS_LABELS[status]}
        </Button>
      ))}
      {targets.includes('created' as MaintenanceTicketStatus) && (
        <div className="w-full sm:max-w-xs">
          <Label htmlFor="action-note" className="text-xs">
            Reopen note
          </Label>
          <Input
            id="action-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Required to reopen"
            className="mt-1"
          />
        </div>
      )}
    </div>
  );
}

export function AssignPanel({
  vendors,
  vendorId,
  staffId,
  onAssignVendor,
  onAssignStaff,
  loading,
}: {
  vendors: Vendor[];
  vendorId: string | null;
  staffId: string | null;
  onAssignVendor: (vendorId: string | null) => void;
  onAssignStaff: (staffId: string | null) => void;
  loading?: boolean;
}) {
  const [staffInput, setStaffInput] = useState(staffId ?? '');

  useEffect(() => {
    setStaffInput(staffId ?? '');
  }, [staffId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Assignment</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Vendor</Label>
          <Select
            value={vendorId ?? 'none'}
            onValueChange={(v) => onAssignVendor(v === 'none' ? null : v)}
            disabled={loading}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select vendor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Unassigned</SelectItem>
              {vendors.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="staff-id">Staff (user ID)</Label>
          <div className="mt-1 flex gap-2">
            <Input
              id="staff-id"
              value={staffInput}
              onChange={(e) => setStaffInput(e.target.value)}
              placeholder="UUID of maintenance staff"
              disabled={loading}
              className="font-mono text-xs"
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={loading}
              onClick={() =>
                onAssignStaff(staffInput.trim() ? staffInput.trim() : null)
              }
            >
              Save
            </Button>
          </div>
          {staffId && (
            <p className="mt-1 text-xs text-muted-foreground">
              Assigned: {staffId}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function ActivityTimeline({
  updates,
}: {
  updates: MaintenanceTicketDetail['updates'];
}) {
  const sorted = [...updates].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground">No updates yet.</p>
        ) : (
          <ol className="relative space-y-4 border-l pl-4">
            {sorted.map((u) => (
              <li key={u.id} className="text-sm">
                <time className="text-xs text-muted-foreground">
                  {format(new Date(u.createdAt), 'MMM d, yyyy h:mm a')}
                </time>
                <p className="font-medium">
                  {u.statusFrom ? `${STATUS_LABELS[u.statusFrom]} → ` : ''}
                  {STATUS_LABELS[u.statusTo]}
                </p>
                {u.note && <p className="text-muted-foreground">{u.note}</p>}
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

export function AttachmentsGrid({
  attachments,
  onDownload,
}: {
  attachments: MaintenanceTicketDetail['attachments'];
  onDownload: (attachmentId: string, fileName: string) => void;
}) {
  const images = attachments.filter((a) => a.mimeType.startsWith('image/'));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Attachments</CardTitle>
      </CardHeader>
      <CardContent>
        {images.length === 0 ? (
          <p className="text-sm text-muted-foreground">No attachments.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {images.map((a) => (
              <button
                key={a.id}
                type="button"
                className="group overflow-hidden rounded-lg border text-left"
                onClick={() => onDownload(a.id, a.fileName)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={a.storageUrl}
                  alt={a.fileName}
                  className="aspect-square w-full object-cover transition group-hover:opacity-90"
                />
                <p className="truncate p-2 text-xs">{a.fileName}</p>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function AiClassificationCard({
  ai,
}: {
  ai: MaintenanceAiClassification | null;
}) {
  if (!ai) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">AI classification</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Pending or not available.</p>
        </CardContent>
      </Card>
    );
  }

  const confidence =
    typeof ai.confidence === 'number' ? Math.round(ai.confidence * 100) : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">AI classification</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {ai.summary && <p>{ai.summary}</p>}
        {confidence != null && (
          <div>
            <div className="mb-1 flex justify-between text-xs">
              <span>Confidence</span>
              <span>{confidence}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${confidence}%` }}
              />
            </div>
          </div>
        )}
        {ai.reasoning && (
          <p className="text-muted-foreground text-xs">{ai.reasoning}</p>
        )}
      </CardContent>
    </Card>
  );
}

export function VendorInvoicesSection({
  invoices,
  onApprove,
  onPay,
  loading,
}: {
  invoices: VendorInvoice[];
  onApprove: (id: string) => void;
  onPay: (id: string) => void;
  loading?: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Vendor invoices</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {invoices.length === 0 ? (
          <p className="text-sm text-muted-foreground">No vendor invoices.</p>
        ) : (
          invoices.map((inv) => (
            <div
              key={inv.id}
              className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium">{formatUsd(inv.amount)}</p>
                <p className="text-xs text-muted-foreground">
                  {inv.vendorName ?? 'Vendor'} · Due {inv.dueDate} · {inv.status}
                </p>
              </div>
              <div className="flex gap-2">
                {inv.status === 'pending' && (
                  <Button size="sm" variant="outline" disabled={loading} onClick={() => onApprove(inv.id)}>
                    Approve
                  </Button>
                )}
                {inv.status === 'approved' && (
                  <Button size="sm" disabled={loading} onClick={() => onPay(inv.id)}>
                    Mark paid
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export function TicketDetailHeader({
  ticket,
}: {
  ticket: MaintenanceTicketDetail;
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={ticket.status} />
        <PriorityBadge priority={ticket.priority} />
        <span className="inline-flex items-center gap-1 text-sm capitalize text-muted-foreground">
          <TradeIcon trade={ticket.trade} />
          {ticket.trade.replace('_', ' ')}
        </span>
        <SlaIndicator slaDueAt={ticket.slaDueAt} status={ticket.status} />
      </div>
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{ticket.title}</h1>
      {ticket.description && (
        <p className="text-muted-foreground max-w-3xl">{ticket.description}</p>
      )}
    </div>
  );
}

export function RatingStars({ rating }: { rating: string | null }) {
  const value = rating ? parseFloat(rating) : 0;
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${
            i <= Math.round(value) ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'
          }`}
        />
      ))}
      <span className="ml-1 text-sm text-muted-foreground">
        {rating ?? '—'}
      </span>
    </span>
  );
}
