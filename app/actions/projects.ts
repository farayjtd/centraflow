'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { ProjectStatus } from '@/lib/types';

export async function createProject(formData: {
  project_name: string;
  client_name: string;
  client_address: string;
  client_phone: string;
  start_date: string;
  end_target: string;
  warehouse_id: string;
  boq_file_url?: string;
}) {
  const supabase = await createClient();
  const { data: user } = await supabase.from('users').select('id').eq('auth_id', (await supabase.auth.getUser()).data.user?.id).single();
  const { data, error } = await supabase.from('projects').insert({
    ...formData,
    created_by: user?.id,
    status: 'Panding',
    ts_approval: 'Pending',
  }).select().single();
  if (error) return { error: error.message };
  revalidatePath('/dashboard/proyek');
  return { success: true, id: data.id };
}

export async function updateProject(id: string, formData: {
  project_name: string;
  client_name: string;
  client_address: string;
  client_phone: string;
  start_date: string;
  end_target: string;
  warehouse_id: string;
  status: ProjectStatus;
  boq_file_url?: string;
}) {
  const supabase = await createClient();
  const { error } = await supabase.from('projects').update(formData).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/dashboard/proyek');
  return { success: true };
}

export async function deleteProject(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('projects').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/dashboard/proyek');
  return { success: true };
}

export async function addBOQItem(projectId: string, materialId: string, quantityRequired: number) {
  const supabase = await createClient();
  const { error } = await supabase.from('project_materials').insert({
    project_id: projectId,
    material_id: materialId,
    quantity_required: quantityRequired,
  });
  if (error) return { error: error.message };
  revalidatePath('/dashboard/proyek');
  return { success: true };
}

export async function updateBOQItem(id: string, quantityRequired: number) {
  const supabase = await createClient();
  const { error } = await supabase.from('project_materials').update({
    quantity_required: quantityRequired,
  }).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/dashboard/proyek');
  return { success: true };
}

export async function deleteBOQItem(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('project_materials').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/dashboard/proyek');
  return { success: true };
}