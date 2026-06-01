import { Avatar, AvatarFallback } from '@web/components/ui/avatar';
import { cn } from '@web/lib/utils';

const AVATAR_COLORS = [
  'bg-blue-600 text-white',
  'bg-emerald-600 text-white',
  'bg-violet-600 text-white',
  'bg-amber-600 text-white',
  'bg-rose-600 text-white',
  'bg-cyan-700 text-white',
  'bg-indigo-600 text-white',
  'bg-teal-700 text-white',
];

function colorForName(firstName: string, lastName: string): string {
  const seed = `${firstName}${lastName}`.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_COLORS[seed % AVATAR_COLORS.length]!;
}

export function TenantAvatar({
  firstName,
  lastName,
  className,
}: {
  firstName: string;
  lastName: string;
  className?: string;
}) {
  const initials = `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase();
  const color = colorForName(firstName, lastName);

  return (
    <Avatar className={cn('h-16 w-16 text-lg', className)}>
      <AvatarFallback className={cn('font-semibold', color)}>{initials}</AvatarFallback>
    </Avatar>
  );
}
