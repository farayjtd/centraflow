'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { MaterialRequestStatus } from '@/lib/types';

export async function createMaterialRequest(formData: {
  project_id: string;
  material_id: string;
  quantity: number;
}) {
  const supabase = await createClient();

  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('auth_id', (await supabase.auth.getUser()).data.user?.id)
    .single();

  const { error } = await supabase.from('material_request').insert({
    ...formData,
    status_wh: 'Pending',
    requested_by: user?.id,
  });

  if (error) return { error: error.message };
  revalidatePath('/dashboard/material-request');
  return { success: true };
}

export async function updateMaterialRequestStatus(
  id: string,
  status: MaterialRequestStatus,
  warehouseId?: string,
  materialId?: string,
  quantity?: number
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('material_request')
    .update({ status_wh: status })
    .eq('id', id);

  if (error) return { error: error.message };

  // Kalau Selesai, tambah stok otomatis
  if (status === 'Selesai' && warehouseId && materialId && quantity) {
    const { data: existing } = await supabase
      .from('stock_management')
      .select('id, current_stock')
      .eq('material_id', materialId)
      .eq('warehouse_id', warehouseId)
      .single();

    if (existing) {
      await supabase
        .from('stock_management')
        .update({
          current_stock: existing.current_stock + quantity,
          updated_date: new Date().toISOString().split('T')[0],
        })
        .eq('id', existing.id);
    } else {
      await supabase.from('stock_management').insert({
        material_id: materialId,
        warehouse_id: warehouseId,
        current_stock: quantity,
        reserved_stock: 0,
        updated_date: new Date().toISOString().split('T')[0],
      });
    }
  }

  revalidatePath('/dashboard/material-request');
  return { success: true };
}

export async function deleteMaterialRequest(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('material_request').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/dashboard/material-request');
  return { success: true };
}