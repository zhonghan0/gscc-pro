'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Heart, Eye, EyeOff, CheckCircle2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

export default function ActivatePage() {
  const router = useRouter()
  const [fullName, setFullName]       = useState('')
  const [password, setPassword]       = useState('')
  const [confirm, setConfirm]         = useState('')
  const [showPw, setShowPw]           = useState(false)
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')
  const [done, setDone]               = useState(false)
  const [checking, setChecking]       = useState(true)
  const [sessionOk, setSessionOk]     = useState(false)

  useEffect(() => {
    // Check that the user landed here from a valid invite link (i.e. has a session)
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        // Pre-fill name from metadata if available
        const name = user.user_metadata?.full_name ?? ''
        setFullName(name)
        setSessionOk(true)
      }
      setChecking(false)
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }

    setLoading(true)
    setError('')

    const supabase = createClient()

    // Update password
    const { error: pwErr } = await supabase.auth.updateUser({ password })
    if (pwErr) { setError(pwErr.message); setLoading(false); return }

    // Update full name + mark as activated
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (fullName.trim()) {
      await supabase.auth.updateUser({ data: { full_name: fullName.trim() } })
      await supabase.from('profiles').update({ full_name: fullName.trim(), activated_at: new Date().toISOString() }).eq('id', currentUser!.id)
    } else {
      await supabase.from('profiles').update({ activated_at: new Date().toISOString() }).eq('id', currentUser!.id)
    }

    setDone(true)
    setTimeout(() => router.push('/dashboard'), 2000)
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!sessionOk) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full text-center space-y-4">
          <p className="text-gray-700 font-medium">This activation link has expired or is invalid.</p>
          <p className="text-sm text-gray-500">Please ask your admin to send a new invitation.</p>
          <Button variant="outline" onClick={() => router.push('/login')}>Go to Login</Button>
        </div>
      </div>
    )
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center space-y-3">
          <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
          <p className="font-semibold text-gray-900">Account activated!</p>
          <p className="text-sm text-gray-500">Redirecting to dashboard…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl mb-4">
            <Heart className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Activate your account</h1>
          <p className="text-sm text-gray-500 mt-1">Set your password to get started</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Your name"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="password">Password <span className="text-red-500">*</span></Label>
              <div className="relative mt-1">
                <Input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <Label htmlFor="confirm">Confirm Password <span className="text-red-500">*</span></Label>
              <Input
                id="confirm"
                type={showPw ? 'text' : 'password'}
                required
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Repeat password"
                className="mt-1"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Activating…' : 'Activate Account'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
