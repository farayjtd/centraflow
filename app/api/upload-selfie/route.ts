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
  const fileName = `${user.id}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from('attendance-selfies')
    .upload(fileName, file, { upsert: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Generate signed URL (bucket private)
  const { data } = await supabase.storage
    .from('attendance-selfies')
    .createSignedUrl(fileName, 60 * 60 * 24 * 7); // 7 hari

  return NextResponse.json({ url: data?.signedUrl });
}