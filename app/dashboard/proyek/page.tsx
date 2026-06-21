import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ProyekClient } from './ProyekClient';

export default async function ProyekPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect('/login');
  if (!currentUser.roles.some((r) =>
    ['Admin', 'Owner', 'Teknik_Sipil', 'Kepala_WH', 'Mandor'].includes(r)
  )) redirect('/dashboard');

  const supabase = await createClient();

  const [
    { data: projects },
    { data: warehouses },
    { data: materials },
  ] = await Promise.all([
    supabase
      .from('projects')
      .select(`
        *,
        warehouse:warehouse_id(id, name),
        creator:created_by(id, full_name)
      `)
      .order('created_at', { ascending: false }),
    supabase.from('warehouses').select('id, name').order('name'),
    supabase.from('materials').select('id, material_name, unit, category:category_id(name)').order('material_name'),
  ]);

  return (
    <ProyekClient
      projects={projects ?? []}
      warehouses={warehouses ?? []}
      materials={materials ?? []}
      currentUser={currentUser}
    />
  );
}