import { NextRequest, NextResponse } from 'next/server'

const REMEMBER_ME_SECONDS = 24 * 60 * 60   // 24 hours
const REMEMBER_ME_COOKIE = 'care-pro-rm'

export async function POST(request: NextRequest) {
  const { email, password, rememberMe } = await request.json()

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

  const sessionPayload = JSON.stringify({
    access_token,
    refresh_token,
    expires_in,
    expires_at: Math.floor(Date.now() / 1000) + expires_in,
    token_type: 'bearer',
    user: session.user,
  })

  const cookieMaxAge = rememberMe ? REMEMBER_ME_SECONDS : expires_in

  response.cookies.set(cookieName, sessionPayload, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: cookieMaxAge,
  })

  // Set (or clear) the remember-me flag cookie so the middleware can extend
  // the auth cookie on every token refresh for the full 24-hour window.
  if (rememberMe) {
    response.cookies.set(REMEMBER_ME_COOKIE, '1', {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: REMEMBER_ME_SECONDS,
    })
  } else {
    // Ensure any stale flag is cleared
    response.cookies.set(REMEMBER_ME_COOKIE, '', {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    })
  }

  return response
}
