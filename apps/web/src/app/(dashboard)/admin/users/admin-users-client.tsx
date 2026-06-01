'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { UserPlus } from 'lucide-react';
import { AdminNav } from '@web/components/admin/admin-nav';
import { PageHeader } from '@web/components/shared/page-header';
import { Badge } from '@web/components/ui/badge';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@web/components/ui/table';
import { Avatar, AvatarFallback } from '@web/components/ui/avatar';
import type { AdminUser } from '@web/lib/api/types';
import {
  ALL_MEMBERSHIP_ROLES,
  MEMBERSHIP_ROLE_LABELS,
} from '@web/lib/membership-role-labels';
import {
  useAdminUsers,
  useDeactivateUser,
  useUpdateUserRole,
} from '@web/lib/queries/use-admin';

function initials(user: AdminUser) {
  return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
}

function InviteUserDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button">
          <UserPlus className="mr-2 h-4 w-4" />
          Invite user
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite user</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          User invitations are not wired up yet. This form is a preview of the upcoming flow.
        </p>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="invite-email">Email</Label>
            <Input id="invite-email" type="email" placeholder="user@example.com" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="invite-role">Role</Label>
            <Select defaultValue="tenant">
              <SelectTrigger id="invite-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALL_MEMBERSHIP_ROLES.map((role) => (
                  <SelectItem key={role} value={role}>
                    {MEMBERSHIP_ROLE_LABELS[role]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="button" className="w-full" disabled>
            Send invitation (coming soon)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DeactivateDialog({
  user,
  onConfirm,
  loading,
}: {
  user: AdminUser;
  onConfirm: () => void;
  loading: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="outline" disabled={!user.isActive}>
          Deactivate
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Deactivate user</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Deactivate {user.firstName} {user.lastName}? They will lose access to this organization.
        </p>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={loading}
            onClick={() => {
              onConfirm();
              setOpen(false);
            }}
          >
            Deactivate
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function AdminUsersClient({
  initialUsers,
  serverError,
}: {
  initialUsers: AdminUser[] | null;
  serverError: string | null;
}) {
  const { data: users = [], isLoading, error } = useAdminUsers(initialUsers ?? undefined);
  const updateRole = useUpdateUserRole();
  const deactivate = useDeactivateUser();

  return (
    <div className="space-y-6">
      <PageHeader
        title="User management"
        description="Manage organization members and roles."
        actions={<InviteUserDialog />}
      />
      <AdminNav />

      {(error || serverError) && (
        <p className="text-sm text-destructive">{error?.message ?? serverError}</p>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && !users.length ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">{initials(user)}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">
                        {user.firstName} {user.lastName}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{user.email}</TableCell>
                  <TableCell>
                    <Select
                      value={user.role}
                      onValueChange={(role) =>
                        updateRole.mutate({ userId: user.id, role })
                      }
                      disabled={updateRole.isPending}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ALL_MEMBERSHIP_ROLES.map((role) => (
                          <SelectItem key={role} value={role}>
                            {MEMBERSHIP_ROLE_LABELS[role]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.isActive ? 'default' : 'secondary'}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.joinedAt
                      ? format(new Date(user.joinedAt), 'MMM d, yyyy')
                      : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <DeactivateDialog
                      user={user}
                      loading={deactivate.isPending}
                      onConfirm={() => deactivate.mutate(user.id)}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
            {!isLoading && !users.length && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No users found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
