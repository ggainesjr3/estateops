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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@web/components/ui/select';
import { Textarea } from '@web/components/ui/textarea';
import type { CommunicationChannel, CommunicationDirection } from '@web/lib/api/types';
import { useLogTenantCommunication } from '@web/lib/queries/use-tenants';

const CHANNELS = ['email', 'sms', 'phone', 'in_person', 'portal'] as const satisfies readonly CommunicationChannel[];
const DIRECTIONS = ['inbound', 'outbound'] as const satisfies readonly CommunicationDirection[];

const CHANNEL_LABELS: Record<CommunicationChannel, string> = {
  email: 'Email',
  sms: 'SMS',
  phone: 'Phone call',
  in_person: 'In person',
  portal: 'Portal',
};

const schema = z.object({
  channel: z.enum(CHANNELS),
  direction: z.enum(DIRECTIONS),
  subject: z.string().max(500).optional(),
  body: z.string().min(1, 'Message body is required'),
});

type FormValues = z.infer<typeof schema>;

export function LogCommunicationDialog({
  tenantId,
  open,
  onOpenChange,
}: {
  tenantId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const log = useLogTenantCommunication(tenantId);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      channel: 'email',
      direction: 'outbound',
      subject: '',
      body: '',
    },
  });

  const channel = form.watch('channel');

  async function onSubmit(values: FormValues) {
    try {
      await log.mutateAsync({
        channel: values.channel,
        direction: values.direction,
        subject: values.subject || undefined,
        body: values.body,
      });
      form.reset();
      onOpenChange(false);
    } catch {
      // Error shown below.
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Log communication</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Channel</Label>
              <Select
                value={channel}
                onValueChange={(v) => form.setValue('channel', v as CommunicationChannel)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHANNELS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {CHANNEL_LABELS[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Direction</Label>
              <Select
                value={form.watch('direction')}
                onValueChange={(v) =>
                  form.setValue('direction', v as CommunicationDirection)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="outbound">Outbound</SelectItem>
                  <SelectItem value="inbound">Inbound</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {(channel === 'email' || channel === 'portal') && (
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input id="subject" {...form.register('subject')} placeholder="Optional subject" />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="body">Body</Label>
            <Textarea
              id="body"
              {...form.register('body')}
              placeholder="Summary of the conversation or message content"
              className="min-h-[120px]"
            />
            {form.formState.errors.body && (
              <p className="text-xs text-destructive">{form.formState.errors.body.message}</p>
            )}
          </div>

          {log.isError && (
            <p className="text-sm text-destructive">{log.error.message}</p>
          )}

          <Button type="submit" disabled={log.isPending} className="w-full sm:w-auto">
            {log.isPending ? 'Saving…' : 'Log communication'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
