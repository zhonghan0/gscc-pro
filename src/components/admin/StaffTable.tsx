'use client'

import { useState } from 'react'
import type { Profile } from '@/lib/types'
import { updateStaffRole, deleteStaff } from '@/actions/staff'
import { formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Trash2, KeyRound } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface StaffTableProps {
  staff: Profile[]
  currentUserId: string
  currentUserEmail: string
}

function MyAccountCard({ profile, email }: { profile: Profile; email: string }) {
  const [open, setOpen] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword !== confirm) {
      setMessage({ type: 'error', text: 'Passwords do not match.' })
      return
    }
    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters.' })
      return
    }
    setLoading(true)
    setMessage(null)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setLoading(false)
    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setMessage({ type: 'success', text: 'Password updated successfully.' })
      setNewPassword('')
      setConfirm('')
      setOpen(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">My Account</h2>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
            <span className="text-blue-700 font-bold text-lg">
              {profile.full_name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="font-semibold text-gray-900">{profile.full_name}</p>
            <p className="text-sm text-gray-500">{email}</p>
            <Badge variant={profile.role === 'admin' ? 'default' : 'secondary'} className="mt-1">
              {profile.role}
            </Badge>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => { setOpen(o => !o); setMessage(null) }}>
          <KeyRound className="w-4 h-4" /> Change Password
        </Button>
      </div>

      {open && (
        <form onSubmit={handlePasswordChange} className="mt-4 pt-4 border-t border-gray-100 space-y-3 max-w-sm">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New password</label>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Min. 6 characters"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm password</label>
            <input
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Repeat new password"
            />
          </div>
          {message && (
            <p className={`text-sm ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
              {message.text}
            </p>
          )}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={loading}>
              {loading ? 'Saving…' : 'Update Password'}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => { setOpen(false); setMessage(null) }}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}

export function StaffTable({ staff, currentUserId, currentUserEmail }: StaffTableProps) {
  const [pending, setPending] = useState<string | null>(null)

  const me = staff.find(s => s.id === currentUserId)
  const others = staff.filter(s => s.id !== currentUserId)

  async function handleRoleToggle(member: Profile) {
    setPending(member.id)
    const newRole = member.role === 'admin' ? 'staff' : 'admin'
    await updateStaffRole(member.id, newRole)
    setPending(null)
  }

  async function handleDelete(id: string) {
    if (!confirm('Remove this staff member? This cannot be undone.')) return
    setPending(id)
    await deleteStaff(id)
    setPending(null)
  }

  return (
    <div className="space-y-4">
      {me && <MyAccountCard profile={me} email={currentUserEmail} />}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">Joined</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Role</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {others.map(member => (
              <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-700 font-semibold text-xs">
                        {member.full_name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <p className="font-medium text-gray-900">{member.full_name}</p>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">
                  {formatDate(member.created_at)}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={member.role === 'admin' ? 'default' : 'secondary'}>
                    {member.role}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pending === member.id}
                      onClick={() => handleRoleToggle(member)}
                    >
                      {pending === member.id ? '…' : member.role === 'admin' ? 'Make Staff' : 'Make Admin'}
                    </Button>
                    <button
                      onClick={() => handleDelete(member.id)}
                      disabled={pending === member.id}
                      className="text-gray-400 hover:text-red-500 disabled:opacity-50 transition-colors"
                      aria-label="Remove staff"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {others.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-sm text-gray-400">
                  No other staff accounts.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
