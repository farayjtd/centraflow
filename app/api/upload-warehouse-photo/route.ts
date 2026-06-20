import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get('file') as File;
  if (!file) return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 400 });

  const ext = file.name.split('.').pop();
  const fileName = `warehouse_${Date.now()}.${ext}`;

  const { error } = await supabase.storage.from('warehouses').upload(fileName, file, { upsert: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data } = supabase.storage.from('warehouses').getPublicUrl(fileName);
  return NextResponse.json({ url: data.publicUrl });
}