'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { MaterialUnit } from '@/lib/types';

export async function createMaterial(formData: {
  material_name: string;
  category_id: string;
  length: number | null;
  width: number | null;
  unit: MaterialUnit;
}) {
  const supabase = await createClient();
  const { error } = await supabase.from('materials').insert(formData);
  if (error) return { error: error.message };
  revalidatePath('/dashboard/material');
  return { success: true };
}

export async function updateMaterial(id: string, formData: {
  material_name: string;
  category_id: string;
  length: number | null;
  width: number | null;
  unit: MaterialUnit;
}) {
  const supabase = await createClient();
  const { error } = await supabase.from('materials').update(formData).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/dashboard/material');
  return { success: true };
}

export async function deleteMaterial(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('materials').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/dashboard/material');
  return { success: true };
}