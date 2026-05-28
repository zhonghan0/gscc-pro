'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { inviteStaff } from '@/actions/staff'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { ROLES, ROLE_LABELS, ROLE_DESCRIPTIONS, ROLE_BADGE_CLASS, type Role } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import { Mail, Check } from 'lucide-react'

export function InviteStaffForm() {
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole]         = useState<Role>('care_staff')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [done, setDone]         = useState(false)

  // Owners can invite any role except another owner
  const invitableRoles = ROLES.filter(r => r !== 'owner')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await inviteStaff({ email, full_name: fullName, role })
      setDone(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="text-center py-10 space-y-3">
        <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto">
          <Check className="w-7 h-7 text-green-600" />
        </div>
        <p className="font-semibold text-gray-900">Invitation sent!</p>
        <p className="text-sm text-gray-500">
          An activation email has been sent to <strong>{email}</strong>.<br />
          They will set their own password when they click the link.
        </p>
        <Button variant="outline" onClick={() => router.push('/admin/staff')}>
          Back to Users
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
            {invitableRoles.map(r => (
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

      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 flex items-start gap-3">
        <Mail className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-800">
          An invitation email will be sent to the address above. The user will click the link to set their own password and activate their account.
        </p>
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
          {loading ? 'Sending invite…' : 'Send Invitation'}
        </Button>
      </div>
    </form>
  )
}
