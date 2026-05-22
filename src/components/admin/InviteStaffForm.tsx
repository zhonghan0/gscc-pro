'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { inviteStaff } from '@/actions/staff'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'

export function InviteStaffForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<'staff' | 'admin'>('staff')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      await inviteStaff({ email, full_name: fullName, role })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <Label htmlFor="full_name">Full Name *</Label>
        <Input
          id="full_name"
          required
          value={fullName}
          onChange={e => setFullName(e.target.value)}
          placeholder="e.g. Siti Aminah"
        />
      </div>

      <div>
        <Label htmlFor="email">Email Address *</Label>
        <Input
          id="email"
          type="email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="staff@yourcentre.com"
        />
      </div>

      <div>
        <Label htmlFor="role">Role *</Label>
        <Select
          id="role"
          value={role}
          onChange={e => setRole(e.target.value as 'staff' | 'admin')}
        >
          <option value="staff">Staff — can view residents and add care notes</option>
          <option value="admin">Admin — full access including editing residents</option>
        </Select>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
        The new account will be created immediately. Share the email and a temporary password with the staff member so they can log in and change their password.
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
          {loading ? 'Creating…' : 'Create Account'}
        </Button>
      </div>
    </form>
  )
}
