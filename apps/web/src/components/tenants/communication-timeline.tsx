'use client';

import { format } from 'date-fns';
import { Card, CardContent } from '@web/components/ui/card';
import { Skeleton } from '@web/components/ui/skeleton';
import { EmptyState } from '@web/components/shared/empty-state';
import type { CommunicationRecord } from '@web/lib/api/types';
import { cn } from '@web/lib/utils';

export function CommunicationTimeline({
  items,
  isLoading,
}: {
  items?: CommunicationRecord[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  if (!items?.length) {
    return (
      <EmptyState
        title="No communication yet"
        description="Outbound emails and SMS will appear in this timeline."
      />
    );
  }

  return (
    <div className="relative space-y-4 pl-6 before:absolute before:left-2 before:top-2 before:h-[calc(100%-1rem)] before:w-px before:bg-border">
      {items.map((item) => {
        const inbound = item.direction === 'inbound';
        return (
          <div key={item.id} className="relative">
            <span
              className={cn(
                'absolute -left-6 top-3 h-3 w-3 rounded-full border-2 border-background',
                inbound ? 'bg-blue-500' : 'bg-emerald-500',
              )}
            />
            <Card>
              <CardContent className="pt-4 space-y-1">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-medium uppercase">{item.channel}</span>
                  <span>·</span>
                  <span>{inbound ? 'Inbound' : 'Outbound'}</span>
                  <span>·</span>
                  <time dateTime={item.sentAt}>
                    {format(new Date(item.sentAt), 'MMM d, yyyy h:mm a')}
                  </time>
                </div>
                {item.subject && (
                  <p className="font-medium text-sm">{item.subject}</p>
                )}
                <p className="text-sm text-muted-foreground line-clamp-3">{item.body}</p>
              </CardContent>
            </Card>
          </div>
        );
      })}
    </div>
  );
}
