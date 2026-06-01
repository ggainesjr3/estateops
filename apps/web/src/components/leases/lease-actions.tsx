'use client';

import { useState } from 'react';
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
  useLeaseSend,
  useLeaseSign,
  useLeaseTerminate,
} from '@web/lib/queries/use-leases';
import type { LeaseDetail } from '@web/lib/api/types';

export function LeaseActions({ lease }: { lease: LeaseDetail }) {
  const send = useLeaseSend();
  const sign = useLeaseSign();
  const terminate = useLeaseTerminate();
  const [terminateOpen, setTerminateOpen] = useState(false);
  const [reason, setReason] = useState('');

  const pending =
    send.isPending || sign.isPending || terminate.isPending;

  async function handleMarkAsSigned() {
    if (!lease.signedByTenantAt) {
      await sign.mutateAsync({ id: lease.id, role: 'tenant' });
    }
    if (!lease.signedByManagerAt) {
      await sign.mutateAsync({ id: lease.id, role: 'manager' });
    }
  }

  if (lease.status === 'draft') {
    return (
      <Button
        type="button"
        size="sm"
        disabled={pending}
        onClick={() => send.mutateAsync({ id: lease.id, optimistic: { status: 'pending' } })}
      >
        {send.isPending ? 'Sending…' : 'Send for signature'}
      </Button>
    );
  }

  if (lease.status === 'pending') {
    return (
      <Button
        type="button"
        size="sm"
        disabled={pending}
        onClick={handleMarkAsSigned}
      >
        {sign.isPending ? 'Signing…' : 'Mark as signed'}
      </Button>
    );
  }

  if (lease.status === 'active') {
    return (
      <>
        <Button
          type="button"
          size="sm"
          variant="destructive"
          disabled={pending}
          onClick={() => setTerminateOpen(true)}
        >
          Terminate
        </Button>

        <Dialog open={terminateOpen} onOpenChange={setTerminateOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Terminate lease</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reason">Reason</Label>
                <Input
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Move-out, breach, mutual agreement…"
                />
              </div>
              <Button
                variant="destructive"
                className="w-full"
                disabled={!reason.trim() || terminate.isPending}
                onClick={async () => {
                  await terminate.mutateAsync({ id: lease.id, reason });
                  setTerminateOpen(false);
                  setReason('');
                }}
              >
                Confirm termination
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <p className="text-sm text-muted-foreground">No actions available for this status.</p>
  );
}
