'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@web/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { useCreateLease } from '@web/lib/queries/use-leases';
import { usePropertiesList, usePropertyUnits } from '@web/lib/queries/use-properties';
import { useTenantsList } from '@web/lib/queries/use-tenants';
import { cn } from '@web/lib/utils';

const STEPS = [
  { id: 1, label: 'Property & unit' },
  { id: 2, label: 'Tenant' },
  { id: 3, label: 'Lease terms' },
  { id: 4, label: 'Review' },
] as const;

interface FormState {
  propertyId: string;
  unitId: string;
  tenantId: string;
  startDate: string;
  endDate: string;
  monthlyRent: string;
  securityDeposit: string;
  lateFeeAmount: string;
  lateFeeGraceDays: string;
}

const DEFAULT_FORM: FormState = {
  propertyId: '',
  unitId: '',
  tenantId: '',
  startDate: new Date().toISOString().slice(0, 10),
  endDate: '',
  monthlyRent: '',
  securityDeposit: '',
  lateFeeAmount: '50',
  lateFeeGraceDays: '5',
};

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="space-y-3">
      <div className="flex justify-between gap-1">
        {STEPS.map((step) => (
          <div
            key={step.id}
            className={cn(
              'h-1.5 flex-1 rounded-full transition-colors',
              step.id <= currentStep ? 'bg-primary' : 'bg-muted',
            )}
          />
        ))}
      </div>
      <ol className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {STEPS.map((step) => (
          <li
            key={step.id}
            className={cn(
              'flex items-center gap-1.5',
              step.id === currentStep && 'font-medium text-foreground',
              step.id < currentStep && 'text-primary',
            )}
          >
            <span
              className={cn(
                'flex h-5 w-5 items-center justify-center rounded-full border text-[10px]',
                step.id < currentStep && 'border-primary bg-primary text-primary-foreground',
                step.id === currentStep && 'border-primary',
              )}
            >
              {step.id < currentStep ? <Check className="h-3 w-3" /> : step.id}
            </span>
            {step.label}
          </li>
        ))}
      </ol>
    </div>
  );
}

export function CreateLeaseDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [createdLeaseId, setCreatedLeaseId] = useState<string | null>(null);

  const createLease = useCreateLease();
  const { data: properties = [] } = usePropertiesList({ limit: '100' });
  const { data: units = [] } = usePropertyUnits(form.propertyId || '');
  const { data: tenants = [] } = useTenantsList({ limit: '100' });

  const selectedProperty = properties.find((p) => p.id === form.propertyId);
  const selectedUnit = units.find((u) => u.id === form.unitId);
  const selectedTenant = tenants.find((t) => t.id === form.tenantId);

  const tenantLabel = selectedTenant
    ? `${selectedTenant.firstName} ${selectedTenant.lastName}`
    : '—';

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function validateStep(current: number): boolean {
    const nextErrors: Partial<Record<keyof FormState, string>> = {};

    if (current === 1) {
      if (!form.propertyId) nextErrors.propertyId = 'Select a property';
      if (!form.unitId) nextErrors.unitId = 'Select a unit';
    }
    if (current === 2) {
      if (!form.tenantId) nextErrors.tenantId = 'Select a tenant';
    }
    if (current === 3) {
      if (!form.startDate) nextErrors.startDate = 'Start date is required';
      if (!form.monthlyRent || !/^\d+(\.\d{1,2})?$/.test(form.monthlyRent)) {
        nextErrors.monthlyRent = 'Enter a valid monthly rent';
      }
      if (form.endDate && form.endDate <= form.startDate) {
        nextErrors.endDate = 'End date must be after start date';
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleNext() {
    if (!validateStep(step)) return;
    setStep((s) => Math.min(s + 1, STEPS.length));
  }

  function handleBack() {
    setStep((s) => Math.max(s - 1, 1));
  }

  function resetDialog() {
    setStep(1);
    setForm(DEFAULT_FORM);
    setErrors({});
    setCreatedLeaseId(null);
    createLease.reset();
  }

  function handleOpenChange(next: boolean) {
    if (!next) resetDialog();
    onOpenChange(next);
  }

  async function handleSubmit() {
    if (!validateStep(3)) {
      setStep(3);
      return;
    }

    try {
      const lease = await createLease.mutateAsync({
        propertyId: form.propertyId,
        unitId: form.unitId,
        startDate: form.startDate,
        endDate: form.endDate || undefined,
        monthlyRent: form.monthlyRent,
        securityDeposit: form.securityDeposit || undefined,
        lateFeeAmount: form.lateFeeAmount || '50',
        lateFeeGraceDays: Number(form.lateFeeGraceDays) || 5,
        tenants: [{ tenantId: form.tenantId, isPrimary: true }],
      });
      setCreatedLeaseId(lease.id);
      onCreated?.();
    } catch {
      // Error shown via createLease.isError
    }
  }

  const reviewRows = useMemo(
    () => [
      { label: 'Property', value: selectedProperty?.name ?? '—' },
      {
        label: 'Unit',
        value: selectedUnit ? `Unit ${selectedUnit.unitNumber}` : '—',
      },
      { label: 'Tenant', value: tenantLabel },
      {
        label: 'Term',
        value: form.endDate
          ? `${format(new Date(form.startDate), 'MMM d, yyyy')} – ${format(new Date(form.endDate), 'MMM d, yyyy')}`
          : `${format(new Date(form.startDate), 'MMM d, yyyy')} – ongoing`,
      },
      { label: 'Monthly rent', value: `$${form.monthlyRent}` },
      {
        label: 'Security deposit',
        value: form.securityDeposit ? `$${form.securityDeposit}` : '—',
      },
      { label: 'Late fee', value: `$${form.lateFeeAmount}` },
      { label: 'Late fee grace', value: `${form.lateFeeGraceDays} days` },
    ],
    [form, selectedProperty, selectedUnit, tenantLabel],
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {createdLeaseId ? 'Lease created' : 'Create lease'}
          </DialogTitle>
        </DialogHeader>

        {createdLeaseId ? (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              The lease was saved as a draft. Send it for signature when you are ready.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button asChild className="flex-1">
                <Link href={`/leases/${createdLeaseId}`}>View lease</Link>
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => handleOpenChange(false)}
              >
                Close
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <StepIndicator currentStep={step} />

            {step === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Property</Label>
                  <Select
                    value={form.propertyId}
                    onValueChange={(v) => {
                      updateField('propertyId', v);
                      updateField('unitId', '');
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select property" />
                    </SelectTrigger>
                    <SelectContent>
                      {properties.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.propertyId && (
                    <p className="text-xs text-destructive">{errors.propertyId}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Unit</Label>
                  <Select
                    value={form.unitId}
                    onValueChange={(v) => {
                      const unit = units.find((u) => u.id === v);
                      setForm((prev) => ({
                        ...prev,
                        unitId: v,
                        monthlyRent:
                          unit?.monthlyRent != null
                            ? String(unit.monthlyRent)
                            : prev.monthlyRent,
                      }));
                      setErrors((prev) => ({ ...prev, unitId: undefined }));
                    }}
                    disabled={!form.propertyId}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          form.propertyId ? 'Select unit' : 'Choose a property first'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {units.length === 0 ? (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                          No units for this property
                        </div>
                      ) : (
                        units.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            Unit {u.unitNumber}
                            {u.monthlyRent != null ? ` · $${u.monthlyRent}/mo` : ''}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {errors.unitId && (
                    <p className="text-xs text-destructive">{errors.unitId}</p>
                  )}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Tenant</Label>
                  <Select
                    value={form.tenantId}
                    onValueChange={(v) => updateField('tenantId', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select tenant" />
                    </SelectTrigger>
                    <SelectContent>
                      {tenants.length === 0 ? (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                          No tenants found
                        </div>
                      ) : (
                        tenants.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.firstName} {t.lastName} · {t.email}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {errors.tenantId && (
                    <p className="text-xs text-destructive">{errors.tenantId}</p>
                  )}
                </div>
                <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                  Need someone new?{' '}
                  <Link href="/tenants" className="text-primary hover:underline">
                    Create a tenant first
                  </Link>{' '}
                  under Tenants, then return here to attach them to the lease.
                </p>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Start date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={form.startDate}
                      onChange={(e) => updateField('startDate', e.target.value)}
                    />
                    {errors.startDate && (
                      <p className="text-xs text-destructive">{errors.startDate}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate">End date (optional)</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={form.endDate}
                      onChange={(e) => updateField('endDate', e.target.value)}
                    />
                    {errors.endDate && (
                      <p className="text-xs text-destructive">{errors.endDate}</p>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="monthlyRent">Monthly rent</Label>
                    <Input
                      id="monthlyRent"
                      inputMode="decimal"
                      placeholder="1200.00"
                      value={form.monthlyRent}
                      onChange={(e) => updateField('monthlyRent', e.target.value)}
                    />
                    {errors.monthlyRent && (
                      <p className="text-xs text-destructive">{errors.monthlyRent}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="securityDeposit">Security deposit</Label>
                    <Input
                      id="securityDeposit"
                      inputMode="decimal"
                      placeholder="1200.00"
                      value={form.securityDeposit}
                      onChange={(e) => updateField('securityDeposit', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="lateFeeAmount">Late fee amount</Label>
                    <Input
                      id="lateFeeAmount"
                      inputMode="decimal"
                      value={form.lateFeeAmount}
                      onChange={(e) => updateField('lateFeeAmount', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lateFeeGraceDays">Late fee grace days</Label>
                    <Input
                      id="lateFeeGraceDays"
                      type="number"
                      min={0}
                      value={form.lateFeeGraceDays}
                      onChange={(e) => updateField('lateFeeGraceDays', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-3 rounded-md border p-4 text-sm">
                {reviewRows.map((row) => (
                  <div key={row.label} className="flex justify-between gap-4">
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className="font-medium text-right">{row.value}</span>
                  </div>
                ))}
                <p className="border-t pt-3 text-xs text-muted-foreground">
                  The lease will be created in <strong>draft</strong> status.
                </p>
              </div>
            )}

            {createLease.isError && (
              <p className="text-sm text-destructive">{createLease.error.message}</p>
            )}

            <div className="flex justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={step === 1 || createLease.isPending}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Back
              </Button>
              {step < STEPS.length ? (
                <Button type="button" onClick={handleNext}>
                  Next
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={createLease.isPending}
                >
                  {createLease.isPending ? 'Creating…' : 'Create lease'}
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
