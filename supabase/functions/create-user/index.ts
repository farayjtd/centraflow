import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verifikasi caller adalah Admin
    const authHeader = req.headers.get('Authorization');
    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader! } } }
    );

    const { data: { user: caller } } = await anonClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Cek apakah caller adalah Admin
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: callerRoles } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', (await adminClient
        .from('users')
        .select('id')
        .eq('auth_id', caller.id)
        .single()
      ).data?.id);

    const isAdmin = callerRoles?.some((r: any) => r.role === 'Admin');
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { full_name, username, email, password, phone, roles } = await req.json();

    if (!full_name || !username || !email || !password || !roles?.length) {
      return new Response(JSON.stringify({ error: 'Data tidak lengkap' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Cek username sudah ada atau belum
    const { data: existingUsername } = await adminClient
      .from('users')
      .select('id')
      .eq('username', username.toLowerCase())
      .single();

    if (existingUsername) {
      return new Response(JSON.stringify({ error: 'Username sudah digunakan' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Buat user di Supabase Auth
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    });

    if (authError || !authData.user) {
      return new Response(JSON.stringify({ error: authError?.message ?? 'Gagal membuat user' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Update public.users (trigger sudah buat barisnya, tinggal update)
    await adminClient
      .from('users')
      .update({ username: username.toLowerCase(), phone: phone ?? null })
      .eq('auth_id', authData.user.id);

    // Insert roles
    const userId = (await adminClient
      .from('users')
      .select('id')
      .eq('auth_id', authData.user.id)
      .single()
    ).data?.id;

    if (userId) {
      await adminClient
        .from('user_roles')
        .insert(roles.map((role: string) => ({ user_id: userId, role })));
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});