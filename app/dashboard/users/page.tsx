import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { UsersClient } from './UsersClient';

export default async function UsersPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect('/login');
  if (!currentUser.roles.includes('Admin')) redirect('/dashboard');

  const supabase = await createClient();

  const { data: users } = await supabase
    .from('users')
    .select('*, user_roles(role)')
    .order('created_at', { ascending: false });

  const formattedUsers = (users ?? []).map((u) => ({
    ...u,
    roles: u.user_roles.map((r: { role: string }) => r.role),
  }));

  return <UsersClient users={formattedUsers} currentUserId={currentUser.id} />;
}