import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { AbsensiClient } from './AbsensiClient';

export default async function AbsensiPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect('/login');
  if (!currentUser.roles.some((r) =>
    ['Admin', 'Owner', 'Mandor', 'Tukang', 'Sopir'].includes(r)
  )) redirect('/dashboard');

  const supabase = await createClient();

  const [{ data: attendances }, { data: users }, { data: projects }] = await Promise.all([
    supabase
      .from('attendances')
      .select(`
        *,
        user:user_id(id, full_name, avatar_url),
        project:project_id(id, project_name)
      `)
      .order('timestamp', { ascending: false })
      .limit(200),
    supabase
      .from('users')
      .select('id, full_name, avatar_url')
      .eq('is_active', true)
      .order('full_name'),
    supabase
      .from('projects')
      .select('id, project_name')
      .order('project_name'),
  ]);

  return (
    <AbsensiClient
      attendances={attendances ?? []}
      users={users ?? []}
      projects={projects ?? []}
      currentUser={currentUser}
    />
  );
}