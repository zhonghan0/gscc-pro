'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createUser } from '@/actions/staff'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { ROLES, ROLE_LABELS, ROLE_DESCRIPTIONS, ROLE_BADGE_CLASS, type Role } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import { Copy, Check, UserPlus } from 'lucide-react'

export function InviteStaffForm() {
  const router = useRouter()
  const [email, setEmail]         = useState('')
  const [fullName, setFullName]   = useState('')
  const [role, setRole]           = useState<Role>('care_staff')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [tempPassword, setTempPassword] = useState('')
  const [copied, setCopied]       = useState(false)

  const creatableRoles = ROLES.filter(r => r !== 'owner')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const result = await createUser({ email, full_name: fullName, role })
      setTempPassword(result.tempPassword)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(tempPassword)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (tempPassword) {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <UserPlus className="w-7 h-7 text-green-600" />
          </div>
          <p className="font-semibold text-gray-900">User created!</p>
          <p className="text-sm text-gray-500">
            Share these login credentials with <strong>{fullName}</strong> securely (e.g. WhatsApp).
            They will be asked to set a new password on first login.
          </p>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Email</p>
            <p className="text-sm font-mono text-gray-900">{email}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Temporary Password</p>
            <div className="flex items-center gap-2">
              <p className="text-sm font-mono font-bold text-gray-900 bg-white border border-gray-300 rounded-lg px-3 py-2 flex-1 tracking-widest">
                {tempPassword}
              </p>
              <Button type="button" variant="outline" size="sm" onClick={handleCopy} className="flex-shrink-0">
                {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          <p className="text-sm text-amber-800">
            ⚠️ This password won't be shown again. Make sure to copy and share it now.
          </p>
        </div>

        <Button className="w-full" onClick={() => router.push('/admin/users')}>
          Done
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label htmlFor="full_name">Full Name <span className="text-red-500">*</span></Label>
          <Input
            id="full_name"
            required
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            placeholder="e.g. Siti Aminah"
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="email">Email Address <span className="text-red-500">*</span></Label>
          <Input
            id="email"
            type="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="user@yourcentre.com"
            className="mt-1"
          />
        </div>

        <div>
          <Label className="mb-2 block">Role <span className="text-red-500">*</span></Label>
          <div className="space-y-2">
            {creatableRoles.map(r => (
              <label
                key={r}
                className={cn(
                  'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                  role === r
                    ? 'border-blue-400 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                )}
              >
                <input
                  type="radio"
                  name="role"
                  value={r}
                  checked={role === r}
                  onChange={() => setRole(r)}
                  className="mt-0.5 accent-blue-600"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{ROLE_LABELS[r]}</span>
                    <span className={cn('text-xs font-medium px-1.5 py-0.5 rounded-full', ROLE_BADGE_CLASS[r])}>
                      {ROLE_LABELS[r]}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{ROLE_DESCRIPTIONS[r]}</p>
                </div>
              </label>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-gray-200">
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Creating…' : 'Create User'}
        </Button>
      </div>
    </form>
  )
}
