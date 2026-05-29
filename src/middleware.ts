import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const REMEMBER_ME_COOKIE = 'care-pro-rm'
const REMEMBER_ME_SECONDS = 24 * 60 * 60

export async function middleware(request: NextRequest) {
  const rememberMe = request.cookies.has(REMEMBER_ME_COOKIE)

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => {
            // If remember-me is active, keep the auth cookie alive for 24h
            // so it doesn't shrink back to 1h after every token refresh.
            const finalOptions =
              rememberMe && name.startsWith('sb-') && name.endsWith('-auth-token')
                ? { ...options, maxAge: REMEMBER_ME_SECONDS }
                : options
            supabaseResponse.cookies.set(name, value, finalOptions)
          })
        },
      },
    }
  )

  // IMPORTANT: do not add any logic between createServerClient and getUser()
  const { data: { user } } = await supabase.auth.getUser()

  const isAuthPage = request.nextUrl.pathname.startsWith('/login')
  const isAuthApi  = request.nextUrl.pathname.startsWith('/api/auth')
  const isActivate = request.nextUrl.pathname.startsWith('/activate')

  if (!user && !isAuthPage && !isAuthApi && !isActivate) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    const redirectResponse = NextResponse.redirect(url)
    supabaseResponse.cookies.getAll().forEach(cookie => {
      redirectResponse.cookies.set(cookie.name, cookie.value)
    })
    return redirectResponse
  }

  if (user && isAuthPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    const redirectResponse = NextResponse.redirect(url)
    supabaseResponse.cookies.getAll().forEach(cookie => {
      redirectResponse.cookies.set(cookie.name, cookie.value)
    })
    return redirectResponse
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
