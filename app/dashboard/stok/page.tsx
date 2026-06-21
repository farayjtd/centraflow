import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { StokClient } from './StokClient';

export default async function StokPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect('/login');
  if (!currentUser.roles.some((r) => ['Admin', 'Owner', 'Kepala_WH'].includes(r))) redirect('/dashboard');

  const supabase = await createClient();

  const [{ data: stocks }, { data: materials }, { data: warehouses }] = await Promise.all([
    supabase
      .from('stock_management')
      .select(`
        *,
        material:material_id(id, material_name, unit, category:category_id(name)),
        warehouse:warehouse_id(id, name)
      `)
      .order('created_at', { ascending: false }),
    supabase
      .from('materials')
      .select('id, material_name, unit, category:category_id(name)')
      .order('material_name'),
    supabase
      .from('warehouses')
      .select('id, name')
      .order('name'),
  ]);

  return (
    <StokClient
      stocks={stocks ?? []}
      materials={materials ?? []}
      warehouses={warehouses ?? []}
    />
  );
}