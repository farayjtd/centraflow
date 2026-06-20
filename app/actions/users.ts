'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { AppRole } from '@/lib/types';

export async function createUser(formData: {
  full_name: string;
  username: string;
  email: string;
  password: string;
  phone: string;
  roles: AppRole[];
  avatar_url?: string;
}) {
  const supabase = await createClient();

  const { data, error } = await supabase.functions.invoke('create-user', {
    body: formData,
  });

  if (error) return { error: error.message };
  if (data?.error) return { error: data.error };

  revalidatePath('/dashboard/users');
  return { success: true };
}

export async function updateUser(id: string, formData: {
  full_name: string;
  username: string;
  email: string;
  phone: string;
  is_active: boolean;
  roles: AppRole[];
  password?: string;
  avatar_url?: string;
}) {
  const supabase = await createClient();

  // Update profile di public.users
  const { error: profileError } = await supabase
    .from('users')
    .update({
      full_name: formData.full_name,
      username: formData.username,
      email: formData.email,
      phone: formData.phone,
      is_active: formData.is_active,
      ...(formData.avatar_url !== undefined && { avatar_url: formData.avatar_url }),
    })
    .eq('id', id);

  if (profileError) return { error: profileError.message };

  // Update roles
  await supabase.from('user_roles').delete().eq('user_id', id);
  if (formData.roles.length > 0) {
    const { error: rolesError } = await supabase
      .from('user_roles')
      .insert(formData.roles.map((role) => ({ user_id: id, role })));
    if (rolesError) return { error: rolesError.message };
  }

  // Update password jika diisi
  if (formData.password?.trim()) {
    const { data: userData } = await supabase
      .from('users')
      .select('auth_id')
      .eq('id', id)
      .single();

    if (userData?.auth_id) {
      const { error: pwError } = await supabase.functions.invoke('update-user-password', {
        body: { auth_id: userData.auth_id, password: formData.password },
      });
      if (pwError) return { error: 'Gagal update password: ' + pwError.message };
    }
  }

  revalidatePath('/dashboard/users');
  return { success: true };
}

export async function deleteUser(id: string) {
  const supabase = await createClient();

  const { data: userData } = await supabase
    .from('users')
    .select('auth_id')
    .eq('id', id)
    .single();

  const { error } = await supabase
    .from('users')
    .delete()
    .eq('id', id);

  if (error) return { error: error.message };

  if (userData?.auth_id) {
    await supabase.functions.invoke('delete-user', {
      body: { auth_id: userData.auth_id },
    });
  }

  revalidatePath('/dashboard/users');
  return { success: true };
}

export async function uploadAvatar(formData: FormData): Promise<{ url?: string; error?: string }> {
  const supabase = await createClient();

  const file = formData.get('file') as File;
  if (!file) return { error: 'File tidak ditemukan' };

  const ext = file.name.split('.').pop();
  const fileName = `${Date.now()}.${ext}`;
  const filePath = `avatars/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, file, { upsert: true });

  if (uploadError) return { error: uploadError.message };

  const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
  return { url: data.publicUrl };
}