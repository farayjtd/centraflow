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

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Verifikasi caller adalah Admin atau Kepala_WH
    const { data: callerUser } = await adminClient
      .from('users').select('id').eq('auth_id', caller.id).single();

    const { data: callerRoles } = await adminClient
      .from('user_roles').select('role').eq('user_id', callerUser?.id);

    const hasAccess = callerRoles?.some((r: any) => ['Admin', 'Kepala_WH'].includes(r.role));
    if (!hasAccess) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { project_id, mandor_id, installer_ids, truck_ids, driver_ids } = await req.json();

    if (!project_id) {
      return new Response(JSON.stringify({ error: 'project_id diperlukan' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Cek stok semua BOQ sudah cukup
    const { data: stockReady } = await adminClient
      .from('v_project_stock_ready')
      .select('all_stock_ready')
      .eq('project_id', project_id)
      .single();

    if (!stockReady?.all_stock_ready) {
      return new Response(JSON.stringify({ error: 'Stok belum mencukupi untuk semua item BOQ' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Cek apakah sudah ada eksekusi untuk proyek ini
    const { data: existingExec } = await adminClient
      .from('project_execution')
      .select('id')
      .eq('project_id', project_id)
      .single();

    let executionId: string;

    if (existingExec) {
      // Update eksekusi yang sudah ada
      executionId = existingExec.id;
      await adminClient
        .from('project_execution')
        .update({ mandor_id: mandor_id || null })
        .eq('id', executionId);

      // Hapus junction lama
      await adminClient.from('project_execution_installers').delete().eq('execution_id', executionId);
      await adminClient.from('project_execution_trucks').delete().eq('execution_id', executionId);
      await adminClient.from('project_execution_drivers').delete().eq('execution_id', executionId);
    } else {
      // Buat eksekusi baru
      const { data: newExec, error: execError } = await adminClient
        .from('project_execution')
        .insert({ project_id, mandor_id: mandor_id || null })
        .select()
        .single();

      if (execError || !newExec) {
        return new Response(JSON.stringify({ error: execError?.message ?? 'Gagal membuat eksekusi' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      executionId = newExec.id;

      // Reserve stok untuk proyek ini
      const { data: boqItems } = await adminClient
        .from('project_materials')
        .select('material_id, quantity_required')
        .eq('project_id', project_id);

      const { data: project } = await adminClient
        .from('projects')
        .select('warehouse_id')
        .eq('id', project_id)
        .single();

      if (boqItems && project?.warehouse_id) {
        for (const item of boqItems) {
          await adminClient
            .from('stock_management')
            .update({
              reserved_stock: item.quantity_required,
              reserved_project_id: project_id,
              updated_date: new Date().toISOString().split('T')[0],
            })
            .eq('material_id', item.material_id)
            .eq('warehouse_id', project.warehouse_id);
        }
      }
    }

    // Insert junction tables
    if (installer_ids?.length > 0) {
      await adminClient.from('project_execution_installers').insert(
        installer_ids.map((uid: string) => ({ execution_id: executionId, user_id: uid }))
      );
    }

    if (truck_ids?.length > 0) {
      await adminClient.from('project_execution_trucks').insert(
        truck_ids.map((tid: string) => ({ execution_id: executionId, truck_id: tid }))
      );
    }

    if (driver_ids?.length > 0) {
      await adminClient.from('project_execution_drivers').insert(
        driver_ids.map((uid: string) => ({ execution_id: executionId, user_id: uid }))
      );
    }

    // Update status proyek jadi Production
    await adminClient
      .from('projects')
      .update({ status: 'Production' })
      .eq('id', project_id);

    return new Response(JSON.stringify({ success: true, execution_id: executionId }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});