import { serverApi } from '@web/lib/api/endpoints-server';
import { AdminUsersClient } from './admin-users-client';

export default async function AdminUsersPage() {
  let initialUsers = null;
  let serverError: string | null = null;

  try {
    initialUsers = await serverApi.admin.users();
  } catch (e) {
    serverError = e instanceof Error ? e.message : 'Failed to load users';
  }

  return <AdminUsersClient initialUsers={initialUsers} serverError={serverError} />;
}
