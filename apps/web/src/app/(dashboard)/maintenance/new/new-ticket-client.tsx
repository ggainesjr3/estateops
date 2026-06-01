'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, X } from 'lucide-react';
import { PageHeader } from '@web/components/shared/page-header';
import { PriorityBadge } from '@web/components/maintenance/priority-badge';
import { Button } from '@web/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@web/components/ui/card';
import { Input } from '@web/components/ui/input';
import { Label } from '@web/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@web/components/ui/select';
import { cn } from '@web/lib/utils';
import type {
  MaintenanceAiClassification,
  MaintenanceTicketPriority as Priority,
  MaintenanceTrade as Trade,
  PropertyListItem,
} from '@web/lib/api/types';
import { usePropertyUnits } from '@web/lib/queries/use-properties';
import {
  useCreateMaintenanceTicket,
  usePollTicketForAi,
  useUpdateMaintenanceTicket,
} from '@web/lib/queries/use-maintenance';
import { uploadTicketPhoto } from '@web/lib/upload-ticket-photo';
import { useUiStore } from '@web/stores/ui-store';

const MAINTENANCE_PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;
const MAINTENANCE_TRADES = [
  'plumbing',
  'electrical',
  'hvac',
  'appliance',
  'structural',
  'cleaning',
  'landscaping',
  'general',
  'pest_control',
] as const;

type Step = 'form' | 'classifying' | 'review';

export function NewMaintenanceTicketClient({
  properties,
  serverError,
}: {
  properties: PropertyListItem[];
  serverError: string | null;
}) {
  const router = useRouter();
  const token = useUiStore((s) => s.accessToken);
  const create = useCreateMaintenanceTicket();

  const [step, setStep] = useState<Step>('form');
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [propertyId, setPropertyId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority | ''>('');
  const [trade, setTrade] = useState<Trade | ''>('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [overridePriority, setOverridePriority] = useState<Priority | ''>('');
  const [overrideTrade, setOverrideTrade] = useState<Trade | ''>('');

  const { data: units = [] } = usePropertyUnits(propertyId);
  const poll = usePollTicketForAi(ticketId, step === 'classifying');
  const update = useUpdateMaintenanceTicket(ticketId ?? '');

  const ai: MaintenanceAiClassification | null =
    poll.data?.aiClassification ?? null;

  const previewUrls = useMemo(
    () => photos.map((f) => URL.createObjectURL(f)),
    [photos],
  );

  useEffect(() => {
    return () => {
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previewUrls]);

  useEffect(() => {
    if (step !== 'classifying' || !ai) return;
    setStep('review');
    setOverridePriority((ai.priority as Priority) ?? '');
    setOverrideTrade((ai.trade as Trade) ?? '');
  }, [step, ai]);

  const handlePhotos = (files: FileList | null) => {
    if (!files?.length) return;
    setPhotos((prev) => [...prev, ...Array.from(files)].slice(0, 8));
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!propertyId || !title.trim()) return;

    const ticket = await create.mutateAsync({
      propertyId,
      unitId: unitId || undefined,
      title: title.trim(),
      description: description.trim() || undefined,
      priority: priority || undefined,
      trade: trade || undefined,
    });

    setTicketId(ticket.id);
    setStep('classifying');

    if (photos.length && token) {
      for (const file of photos) {
        try {
          await uploadTicketPhoto(ticket.id, propertyId, file, token);
        } catch {
          /* continue — ticket still created */
        }
      }
    }
  };

  const acceptAi = async () => {
    if (!ticketId) return;
    if (overridePriority || overrideTrade) {
      await update.mutateAsync({
        priority: overridePriority || undefined,
        trade: overrideTrade || undefined,
      });
    }
    router.push(`/maintenance/${ticketId}`);
  };

  const saveOverride = async () => {
    if (!ticketId || !overridePriority || !overrideTrade) return;
    await update.mutateAsync({
      priority: overridePriority,
      trade: overrideTrade,
    });
    router.push(`/maintenance/${ticketId}`);
  };

  if (step === 'classifying') {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-lg font-medium">AI is classifying your request…</p>
        <p className="text-sm text-muted-foreground">
          Estimating priority, trade, and summary.
        </p>
        {(poll.error || serverError) && (
          <p className="text-sm text-destructive">
            {poll.error?.message ?? serverError}
          </p>
        )}
        <Button variant="outline" asChild>
          <Link href={`/maintenance/${ticketId}`}>View ticket</Link>
        </Button>
      </div>
    );
  }

  if (step === 'review' && ai) {
    const confidence =
      typeof ai.confidence === 'number' ? Math.round(ai.confidence * 100) : null;

    return (
      <div className="mx-auto max-w-lg space-y-6">
        <PageHeader
          title="AI classification"
          description="Review suggestions before continuing."
        />
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Suggested</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {ai.summary && <p>{ai.summary}</p>}
            <div className="flex flex-wrap gap-2">
              {ai.priority && <PriorityBadge priority={ai.priority} />}
              {ai.trade && (
                <span className="capitalize text-muted-foreground">{ai.trade}</span>
              )}
            </div>
            {confidence != null && (
              <p className="text-xs text-muted-foreground">
                Confidence: {confidence}%
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Override (optional)</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Priority</Label>
              <Select
                value={overridePriority || ai.priority || ''}
                onValueChange={(v) => setOverridePriority(v as Priority)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MAINTENANCE_PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Trade</Label>
              <Select
                value={overrideTrade || ai.trade || ''}
                onValueChange={(v) => setOverrideTrade(v as Trade)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MAINTENANCE_TRADES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button className="flex-1" onClick={() => void acceptAi()}>
            Accept & open ticket
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            disabled={!overridePriority || !overrideTrade}
            onClick={() => void saveOverride()}
          >
            Save override & open
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="New maintenance ticket"
        description="Describe the issue; AI will suggest priority and trade."
      />

      {serverError && (
        <p className="text-sm text-destructive">{serverError}</p>
      )}

      <form onSubmit={(e) => void submitForm(e)} className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="property">Property *</Label>
            <Select value={propertyId} onValueChange={setPropertyId} required>
              <SelectTrigger id="property" className="mt-1">
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
          </div>

          <div>
            <Label htmlFor="unit">Unit</Label>
            <Select
              value={unitId || 'none'}
              onValueChange={(v) => setUnitId(v === 'none' ? '' : v)}
              disabled={!propertyId}
            >
              <SelectTrigger id="unit" className="mt-1">
                <SelectValue placeholder="Optional" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No unit</SelectItem>
                {units.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.unitNumber}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="priority">Priority</Label>
            <Select
              value={priority || 'none'}
              onValueChange={(v) => setPriority(v === 'none' ? '' : (v as Priority))}
            >
              <SelectTrigger id="priority" className="mt-1">
                <SelectValue placeholder="Let AI decide" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Auto (AI)</SelectItem>
                {MAINTENANCE_PRIORITIES.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="sm:col-span-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              className="mt-1"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={500}
            />
          </div>

          <div className="sm:col-span-2">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              className={cn(
                'mt-1 flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              )}
              value={description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setDescription(e.target.value)
              }
            />
          </div>

          <div>
            <Label htmlFor="trade">Trade</Label>
            <Select
              value={trade || 'none'}
              onValueChange={(v) => setTrade(v === 'none' ? '' : (v as Trade))}
            >
              <SelectTrigger id="trade" className="mt-1">
                <SelectValue placeholder="Let AI decide" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Auto (AI)</SelectItem>
                {MAINTENANCE_TRADES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t.replace('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="sm:col-span-2">
            <Label htmlFor="photos">Photos</Label>
            <Input
              id="photos"
              type="file"
              accept="image/*"
              multiple
              className="mt-1"
              onChange={(e) => handlePhotos(e.target.files)}
            />
            {previewUrls.length > 0 && (
              <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                {previewUrls.map((url, i) => (
                  <div key={url} className="relative aspect-square overflow-hidden rounded-md border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      className="absolute right-1 top-1 rounded-full bg-background/80 p-0.5"
                      onClick={() => removePhoto(i)}
                      aria-label="Remove photo"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <Button type="button" variant="outline" asChild>
            <Link href="/maintenance">Cancel</Link>
          </Button>
          <Button type="submit" disabled={create.isPending || !propertyId || !title}>
            {create.isPending ? 'Creating…' : 'Submit ticket'}
          </Button>
        </div>
      </form>
    </div>
  );
}
