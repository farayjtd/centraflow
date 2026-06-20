'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function createCategory(name: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('material_categories')
    .insert({ name: name.trim() });
  if (error) return { error: error.message };
  revalidatePath('/dashboard/kategori-material');
  return { success: true };
}

export async function updateCategory(id: string, name: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('material_categories')
    .update({ name: name.trim() })
    .eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/dashboard/kategori-material');
  return { success: true };
}

export async function deleteCategory(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('material_categories')
    .delete()
    .eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/dashboard/kategori-material');
  return { success: true };
}