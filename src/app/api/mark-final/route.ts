import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: Request) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server missing SUPABASE_SECRET_KEY or not running on server.' }, { status: 500 })
    }
    const { sessionId, mockupId } = await req.json()
    if (!sessionId || !mockupId) {
      return NextResponse.json({ error: 'Missing sessionId or mockupId' }, { status: 400 })
    }

    // Fetch mockup to get image_url
    const { data: mockup, error: getErr } = await supabaseAdmin
      .from('mockups')
      .select('id, image_url, session_id')
      .eq('id', mockupId)
      .single()

    if (getErr || !mockup) {
      console.error('mark-final get mockup error:', getErr)
      return NextResponse.json({ error: getErr?.message || 'Mockup not found' }, { status: 404 })
    }

    // Reset all others for the session
    const { error: resetErr } = await supabaseAdmin
      .from('mockups')
      .update({ is_final: false })
      .eq('session_id', sessionId)

    if (resetErr) {
      console.error('mark-final reset error:', resetErr)
      return NextResponse.json({ error: resetErr.message }, { status: 500 })
    }

    // Mark this one as final
    const { error: finalErr } = await supabaseAdmin
      .from('mockups')
      .update({ is_final: true })
      .eq('id', mockupId)

    if (finalErr) {
      console.error('mark-final final set error:', finalErr)
      return NextResponse.json({ error: finalErr.message }, { status: 500 })
    }

    // Update session with final image url
    const { error: sessErr } = await supabaseAdmin
      .from('sessions')
      .update({ final_mockup_url: mockup.image_url, updated_at: new Date().toISOString() })
      .eq('id', sessionId)

    if (sessErr) {
      console.error('mark-final session update error:', sessErr)
      return NextResponse.json({ error: sessErr.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, final_mockup_url: mockup.image_url })
  } catch (e: any) {
    console.error('mark-final unexpected error:', e)
    return NextResponse.json({ error: e?.message || 'Unknown error' }, { status: 500 })
  }
}


