import { createClient } from '@/lib/supabase/server';
import type { AppRole, UserProfile } from '@/lib/types';

export async function getCurrentUser(): Promise<UserProfile | null> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('users')
    .select('*, user_roles(role)')
    .eq('auth_id', user.id)
    .single();

  if (!data) return null;

  return {
    ...data,
    roles: data.user_roles.map((r: { role: AppRole }) => r.role),
  };
}

export function hasRole(roles: AppRole[], check: AppRole | AppRole[]): boolean {
  if (Array.isArray(check)) return check.some((r) => roles.includes(r));
  return roles.includes(check);
}