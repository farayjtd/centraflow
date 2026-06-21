'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function createStock(formData: {
  material_id: string;
  warehouse_id: string;
  current_stock: number;
}) {
  const supabase = await createClient();

  // Cek apakah kombinasi material + warehouse sudah ada
  const { data: existing } = await supabase
    .from('stock_management')
    .select('id')
    .eq('material_id', formData.material_id)
    .eq('warehouse_id', formData.warehouse_id)
    .single();

  if (existing) {
    return { error: 'Stok untuk material dan warehouse ini sudah ada. Gunakan tombol Edit Stok untuk mengubah jumlahnya.' };
  }

  const { error } = await supabase.from('stock_management').insert({
    ...formData,
    reserved_stock: 0,
    updated_date: new Date().toISOString().split('T')[0],
  });

  if (error) return { error: error.message };
  revalidatePath('/dashboard/stok');
  return { success: true };
}

export async function updateStock(id: string, current_stock: number) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('stock_management')
    .update({
      current_stock,
      updated_date: new Date().toISOString().split('T')[0],
    })
    .eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/dashboard/stok');
  return { success: true };
}

export async function deleteStock(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('stock_management').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/dashboard/stok');
  return { success: true };
}