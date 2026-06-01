'use client';

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
import type { MaintenanceTrade } from '@web/lib/api/types';
import { useCreateVendor } from '@web/lib/queries/use-vendors';
import { cn } from '@web/lib/utils';
import { formatTrade, VENDOR_TRADES } from '@web/lib/vendor-trades';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Enter a valid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  trades: z.array(z.enum(VENDOR_TRADES)).min(1, 'Select at least one trade'),
  licenseNumber: z.string().optional(),
  insuranceExpiry: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function AddVendorDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}) {
  const createVendor = useCreateVendor();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      trades: [],
      licenseNumber: '',
      insuranceExpiry: '',
    },
  });

  const selectedTrades = form.watch('trades');

  function toggleTrade(trade: MaintenanceTrade) {
    const current = form.getValues('trades');
    const next = current.includes(trade)
      ? current.filter((t) => t !== trade)
      : [...current, trade];
    form.setValue('trades', next, { shouldValidate: true });
  }

  async function onSubmit(values: FormValues) {
    try {
      await createVendor.mutateAsync({
        name: values.name,
        trades: values.trades,
        email: values.email || undefined,
        phone: values.phone || undefined,
        licenseNumber: values.licenseNumber || undefined,
        insuranceExpiry: values.insuranceExpiry || undefined,
      });
      form.reset();
      onOpenChange(false);
      onCreated?.();
    } catch {
      // Error surfaced via createVendor.isError below.
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add vendor</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="vendorName">Name</Label>
            <Input id="vendorName" {...form.register('name')} placeholder="Acme Plumbing Co." />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="vendorEmail">Email</Label>
              <Input
                id="vendorEmail"
                type="email"
                {...form.register('email')}
                placeholder="contact@vendor.com"
              />
              {form.formState.errors.email && (
                <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="vendorPhone">Phone</Label>
              <Input id="vendorPhone" {...form.register('phone')} placeholder="(555) 123-4567" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Trades</Label>
            <div className="flex flex-wrap gap-2">
              {VENDOR_TRADES.map((trade) => {
                const selected = selectedTrades.includes(trade);
                return (
                  <Button
                    key={trade}
                    type="button"
                    size="sm"
                    variant={selected ? 'default' : 'outline'}
                    className={cn('h-8', !selected && 'font-normal')}
                    onClick={() => toggleTrade(trade)}
                  >
                    {formatTrade(trade)}
                  </Button>
                );
              })}
            </div>
            {form.formState.errors.trades && (
              <p className="text-xs text-destructive">{form.formState.errors.trades.message}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="licenseNumber">License number</Label>
              <Input id="licenseNumber" {...form.register('licenseNumber')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="insuranceExpiry">Insurance expiry</Label>
              <Input id="insuranceExpiry" type="date" {...form.register('insuranceExpiry')} />
            </div>
          </div>

          {createVendor.isError && (
            <p className="text-sm text-destructive">{createVendor.error.message}</p>
          )}

          <Button type="submit" disabled={createVendor.isPending} className="w-full sm:w-auto">
            {createVendor.isPending ? 'Adding…' : 'Add vendor'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
