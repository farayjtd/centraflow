import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { WarehousesClient } from './WarehousesClient';

export default async function GudangPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect('/login');
  if (!currentUser.roles.some((r) => ['Admin', 'Kepala_WH'].includes(r))) redirect('/dashboard');

  const supabase = await createClient();
  const { data: warehouses } = await supabase
    .from('warehouses')
    .select('*')
    .order('created_at', { ascending: false });

  return <WarehousesClient warehouses={warehouses ?? []} />;
}