'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@web/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@web/components/ui/dialog';
import { Input } from '@web/components/ui/input';
import { Label } from '@web/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@web/components/ui/select';
import { Textarea } from '@web/components/ui/textarea';
import { invoiceTypeLabels } from '@web/lib/invoice-status-styles';
import { useCreateInvoice } from '@web/lib/queries/use-accounting';
import { useLeasesList } from '@web/lib/queries/use-leases';

type InvoiceType =
  | 'rent'
  | 'late_fee'
  | 'security_deposit'
  | 'maintenance'
  | 'other';

const INVOICE_TYPES = [
  'rent',
  'late_fee',
  'security_deposit',
  'maintenance',
  'other',
] as const;

// Rent and late-fee amounts are derived from the lease server-side.
const DERIVED_AMOUNT_TYPES: InvoiceType[] = ['rent', 'late_fee'];

const schema = z.object({
  leaseId: z.string().uuid('Select an active lease'),
  type: z.enum(INVOICE_TYPES),
  amountDue: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Enter a valid amount'),
  dueDate: z.string().min(1, 'Select a due date'),
  notes: z.string().max(1000).optional(),
});

type FormValues = z.infer<typeof schema>;

export function CreateInvoiceDialog() {
  const [open, setOpen] = useState(false);
  const createInvoice = useCreateInvoice();
  const { data: leases } = useLeasesList({ status: 'active', limit: '100' });
  const leaseList = leases ?? [];

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: 'rent',
      amountDue: '0.00',
      dueDate: new Date().toISOString().slice(0, 10),
      notes: '',
    },
  });

  const selectedType = form.watch('type');
  const amountDerived = DERIVED_AMOUNT_TYPES.includes(selectedType);

  async function onSubmit(values: FormValues) {
    const notes = values.notes?.trim();
    await createInvoice.mutateAsync({
      leaseId: values.leaseId,
      type: values.type,
      amountDue: values.amountDue || '0.00',
      dueDate: values.dueDate,
      ...(notes ? { notes } : {}),
    });
    setOpen(false);
    form.reset();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Create invoice</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create invoice</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Lease</Label>
            <Select
              value={form.watch('leaseId')}
              onValueChange={(v) => form.setValue('leaseId', v, { shouldValidate: true })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select active lease" />
              </SelectTrigger>
              <SelectContent>
                {leaseList.length === 0 ? (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    No active leases
                  </div>
                ) : (
                  leaseList.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.tenantLabel ?? l.id.slice(0, 8)} · {l.unitLabel}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {form.formState.errors.leaseId && (
              <p className="text-xs text-destructive">
                {form.formState.errors.leaseId.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Type</Label>
            <Select
              value={selectedType}
              onValueChange={(v) => {
                const next = v as InvoiceType;
                form.setValue('type', next);
                if (DERIVED_AMOUNT_TYPES.includes(next)) {
                  form.setValue('amountDue', '0.00', { shouldValidate: true });
                }
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(invoiceTypeLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amountDue">Amount due</Label>
            <Input
              id="amountDue"
              inputMode="decimal"
              {...form.register('amountDue')}
              placeholder="0.00"
              disabled={amountDerived}
            />
            {amountDerived ? (
              <p className="text-xs text-muted-foreground">
                Calculated automatically from the lease.
              </p>
            ) : (
              form.formState.errors.amountDue && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.amountDue.message}
                </p>
              )
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="dueDate">Due date</Label>
            <Input id="dueDate" type="date" {...form.register('dueDate')} />
            {form.formState.errors.dueDate && (
              <p className="text-xs text-destructive">
                {form.formState.errors.dueDate.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              {...form.register('notes')}
              placeholder="Optional memo for this invoice"
            />
          </div>

          {createInvoice.isError && (
            <p className="text-sm text-destructive">{createInvoice.error.message}</p>
          )}
          <Button type="submit" disabled={createInvoice.isPending}>
            {createInvoice.isPending ? 'Creating…' : 'Create'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
