import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { MaterialRequestClient } from './MaterialRequestClient';

export default async function MaterialRequestPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect('/login');
  if (!currentUser.roles.some((r) => ['Admin', 'Kepala_WH', 'Mandor'].includes(r))) redirect('/dashboard');

  const supabase = await createClient();

  const [
    { data: requests },
    { data: projects },
    { data: materials },
    { data: warehouses },
  ] = await Promise.all([
    supabase
      .from('material_request')
      .select(`
        *,
        project:project_id(id, project_name, warehouse_id, warehouse:warehouse_id(id, name)),
        material:material_id(id, material_name, unit, category:category_id(name)),
        requester:requested_by(id, full_name)
      `)
      .order('created_at', { ascending: false }),
    supabase.from('projects').select('id, project_name, warehouse_id').order('project_name'),
    supabase.from('materials').select('id, material_name, unit, category:category_id(name)').order('material_name'),
    supabase.from('warehouses').select('id, name').order('name'),
  ]);

  return (
    <MaterialRequestClient
      requests={requests ?? []}
      projects={projects ?? []}
      materials={materials ?? []}
      warehouses={warehouses ?? []}
      currentUser={currentUser}
    />
  );
}