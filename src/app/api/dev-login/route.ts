import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: Request) {
  try {
    // Guard: only allow in non-production or when explicitly enabled
    if (process.env.NODE_ENV === 'production' && process.env.DEV_LOGIN_ENABLED !== 'true') {
      return NextResponse.json({ error: 'Dev login disabled in production' }, { status: 403 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server auth client unavailable' }, { status: 500 })
    }

    const { email, password } = await request.json()
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
    }

    // Check if user exists
    const { data: existing } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 })
    const user = existing?.users?.find(u => u.email?.toLowerCase() === String(email).toLowerCase())

    if (user) {
      // Update password to ensure we can sign in without email
      await supabaseAdmin.auth.admin.updateUserById(user.id, { password })
      return NextResponse.json({ ok: true, userId: user.id })
    }

    // Create and auto-confirm the user
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, userId: created.user?.id })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unknown error' }, { status: 500 })
  }
}


