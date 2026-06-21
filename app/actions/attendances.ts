'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { AttendanceActivity, AttendanceStatus } from '@/lib/types';

export async function createAttendance(formData: {
  user_id: string;
  project_id?: string;
  activity_type: AttendanceActivity;
  status: AttendanceStatus;
  selfie_photo_url?: string;
  notes?: string;
}) {
  const supabase = await createClient();
  const { error } = await supabase.from('attendances').insert({
    ...formData,
    timestamp: new Date().toISOString(),
  });
  if (error) return { error: error.message };
  revalidatePath('/dashboard/absensi');
  return { success: true };
}

export async function deleteAttendance(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('attendances').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/dashboard/absensi');
  return { success: true };
}