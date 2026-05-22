import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const { email, password } = await request.json()

  // Call Supabase Auth API directly
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      },
      body: JSON.stringify({ email, password }),
    }
  )

  if (!res.ok) {
    const err = await res.json()
    return NextResponse.json({ error: err.error_description || err.msg || 'Invalid credentials' }, { status: 401 })
  }

  const session = await res.json()
  const { access_token, refresh_token, expires_in } = session

  const response = NextResponse.json({ ok: true })

  const projectRef = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname.split('.')[0]
  const cookieName = `sb-${projectRef}-auth-token`

  // Store session as a JSON cookie (same format Supabase SSR expects)
  const sessionPayload = JSON.stringify({
    access_token,
    refresh_token,
    expires_in,
    expires_at: Math.floor(Date.now() / 1000) + expires_in,
    token_type: 'bearer',
    user: session.user,
  })

  response.cookies.set(cookieName, sessionPayload, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: expires_in,
  })

  return response
}
