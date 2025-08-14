import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Delete a session photo from storage and clear it from the session row
// Body: { sessionId: string, imageUrl: string }
export async function POST(req: Request) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Missing SUPABASE_SECRET_KEY on server' }, { status: 500 })
    }

    const { sessionId, imageUrl } = await req.json()
    if (!sessionId || !imageUrl) {
      return NextResponse.json({ error: 'Missing sessionId or imageUrl' }, { status: 400 })
    }

    // Attempt to infer bucket and path from the public URL
    // Typical format: https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>
    const url = new URL(imageUrl)
    const parts = url.pathname.split('/')
    const publicIdx = parts.findIndex((p) => p === 'public')
    if (publicIdx === -1 || publicIdx + 2 > parts.length) {
      return NextResponse.json({ error: 'Unrecognized storage URL format' }, { status: 400 })
    }
    const bucket = parts[publicIdx + 1]
    const pathWithinBucket = parts.slice(publicIdx + 2).join('/')

    // Delete from storage
    const { error: storageErr } = await supabaseAdmin.storage.from(bucket).remove([pathWithinBucket])
    if (storageErr) {
      // Log but continue to clear session so UI can move on even if file was already missing
      console.error('Storage delete error:', storageErr)
    }

    // Clear reference on session and cascade cleanups (optional: delete mockups for that session)
    const { error: sessionErr } = await supabaseAdmin
      .from('sessions')
      .update({ original_image_url: null, updated_at: new Date().toISOString() })
      .eq('id', sessionId)

    if (sessionErr) {
      return NextResponse.json({ error: sessionErr.message }, { status: 500 })
    }

    // Optionally delete generated mockups since the base photo is gone
    await supabaseAdmin.from('mockups').delete().eq('session_id', sessionId)

    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('delete-photo unexpected error:', e)
    return NextResponse.json({ error: e?.message || 'Unknown error' }, { status: 500 })
  }
}


