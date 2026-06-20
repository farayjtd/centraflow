import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { CategoryClient } from './CategoryClient';

export default async function KategoriMaterialPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect('/login');
  if (!currentUser.roles.some((r) => ['Admin', 'Teknik_Sipil'].includes(r))) redirect('/dashboard');

  const supabase = await createClient();
  const { data: categories } = await supabase
    .from('material_categories')
    .select('*')
    .order('created_at', { ascending: false });

  return <CategoryClient categories={categories ?? []} />;
}