import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

export const supabase = createClient<Database>(supabaseUrl, supabasePublishableKey)

// Server-side client for API routes that need elevated permissions
// Only create this on the server side (when the secret key is available)
export const supabaseAdmin = typeof window === 'undefined' && process.env.SUPABASE_SECRET_KEY
  ? createClient<Database>(supabaseUrl, process.env.SUPABASE_SECRET_KEY)
  : null