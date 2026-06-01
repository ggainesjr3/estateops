import Link from 'next/link';
import { Button } from '@web/components/ui/button';

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  href?: string;
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  href,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center sm:p-12">
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">{description}</p>
      {actionLabel &&
        (href ? (
          <Button className="mt-6" asChild>
            <Link href={href}>{actionLabel}</Link>
          </Button>
        ) : (
          <Button className="mt-6" type="button" onClick={onAction}>
            {actionLabel}
          </Button>
        ))}
    </div>
  );
}
