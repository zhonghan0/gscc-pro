import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code       = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type       = searchParams.get('type') as EmailOtpType | null
  const next       = searchParams.get('next') ?? '/dashboard'

  const supabase = createClient()

  if (code) {
    // PKCE flow (magic link, OAuth)
    await supabase.auth.exchangeCodeForSession(code)
  } else if (token_hash && type) {
    // Invite / email-OTP flow
    await supabase.auth.verifyOtp({ token_hash, type })
  }

  return NextResponse.redirect(`${origin}${next}`)
}
