'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@web/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@web/components/ui/dialog';
import { Input } from '@web/components/ui/input';
import { Label } from '@web/components/ui/label';
import { Textarea } from '@web/components/ui/textarea';
import type { TenantDetail } from '@web/lib/api/types';
import { useUpdateTenant } from '@web/lib/queries/use-tenants';

const schema = z.object({
  phone: z.string().optional(),
  notes: z.string().max(2000).optional(),
});

type FormValues = z.infer<typeof schema>;

export function EditTenantDialog({
  tenant,
  open,
  onOpenChange,
}: {
  tenant: TenantDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const update = useUpdateTenant(tenant.id);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      phone: tenant.phone ?? '',
      notes: tenant.notes ?? '',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        phone: tenant.phone ?? '',
        notes: tenant.notes ?? '',
      });
    }
  }, [open, tenant.phone, tenant.notes, form]);

  async function onSubmit(values: FormValues) {
    try {
      await update.mutateAsync({
        phone: values.phone || null,
        notes: values.notes || null,
      });
      onOpenChange(false);
    } catch {
      // Error shown below.
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit tenant</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" {...form.register('phone')} placeholder="(555) 123-4567" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              {...form.register('notes')}
              placeholder="Internal notes about this tenant"
            />
          </div>
          {update.isError && (
            <p className="text-sm text-destructive">{update.error.message}</p>
          )}
          <Button type="submit" disabled={update.isPending}>
            {update.isPending ? 'Saving…' : 'Save changes'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
