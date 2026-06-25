import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  const redirectUrl = url.searchParams.get('redirect') || 'https://google.com';

  if (id) {
    await supabase.from('leads').update({ link_clicked: true }).eq('id', id);
  }

  return NextResponse.redirect(redirectUrl);
}
