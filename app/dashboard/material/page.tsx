import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { MaterialClient } from './MaterialClient';

export default async function MaterialPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect('/login');
  if (!currentUser.roles.some((r) => ['Admin', 'Teknik_Sipil', 'Kepala_WH'].includes(r))) redirect('/dashboard');

  const supabase = await createClient();

  const [{ data: materials }, { data: categories }] = await Promise.all([
    supabase
      .from('materials')
      .select('*, category:category_id(id, name)')
      .order('created_at', { ascending: false }),
    supabase
      .from('material_categories')
      .select('id, name')
      .order('name'),
  ]);

  return <MaterialClient materials={materials ?? []} categories={categories ?? []} />;
}