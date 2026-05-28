'use client'

import { useState } from 'react'
import type { Profile } from '@/lib/types'
import { updateStaffRole, deleteStaff, resetUserPassword } from '@/actions/staff'
import { formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Trash2, KeyRound, Copy, Check, RefreshCw } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ROLES, ROLE_LABELS, ROLE_BADGE_CLASS, ROLE_DESCRIPTIONS, type Role } from '@/lib/permissions'
import { cn } from '@/lib/utils'

interface StaffTableProps {
  staff: Profile[]
  currentUserId: string
  currentUserEmail: string
}

function RoleBadge({ role }: { role: string }) {
  const badgeClass = role in ROLE_BADGE_CLASS
    ? ROLE_BADGE_CLASS[role as Role]
    : 'bg-gray-100 text-gray-600'
  const label = role in ROLE_LABELS ? ROLE_LABELS[role as Role] : role
  return (
    <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', badgeClass)}>
      {label}
    </span>
  )
}

function MyAccountCard({ profile, email }: { profile: Profile; email: string }) {
  const [open, setOpen] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword !== confirm) { setMessage({ type: 'error', text: 'Passwords do not match.' }); return }
    if (newPassword.length < 6) { setMessage({ type: 'error', text: 'Password must be at least 6 characters.' }); return }
    setLoading(true); setMessage(null)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setLoading(false)
    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setMessage({ type: 'success', text: 'Password updated successfully.' })
      setNewPassword(''); setConfirm(''); setOpen(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">My Account</h2>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
            <span className="text-blue-700 font-bold text-lg">{profile.full_name.charAt(0).toUpperCase()}</span>
          </div>
          <div>
            <p className="font-semibold text-gray-900">{profile.full_name}</p>
            <p className="text-sm text-gray-500 mb-1">{email}</p>
            <RoleBadge role={profile.role} />
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
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Min. 6 characters" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm password</label>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Repeat new password" />
          </div>
          {message && <p className={`text-sm ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>{message.text}</p>}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={loading}>{loading ? 'Saving…' : 'Update Password'}</Button>
            <Button type="button" variant="outline" size="sm" onClick={() => { setOpen(false); setMessage(null) }}>Cancel</Button>
          </div>
        </form>
      )}
    </div>
  )
}

function ResetPasswordButton({ memberId }: { memberId: string }) {
  const [loading, setLoading] = useState(false)
  const [tempPassword, setTempPassword] = useState('')
  const [copied, setCopied] = useState(false)

  async function handleReset() {
    if (!confirm('Reset this user\'s password? They will need the new temporary password to log in.')) return
    setLoading(true)
    const result = await resetUserPassword(memberId)
    setTempPassword(result.tempPassword)
    setLoading(false)
  }

  function handleCopy() {
    navigator.clipboard.writeText(tempPassword)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (tempPassword) {
    return (
      <div className="flex items-center gap-1">
        <span className="text-xs font-mono font-bold text-gray-800 bg-amber-50 border border-amber-200 rounded px-2 py-1 tracking-wider">
          {tempPassword}
        </span>
        <button onClick={handleCopy} className="text-gray-400 hover:text-gray-600 transition-colors" title="Copy password">
          {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={handleReset}
      disabled={loading}
      className="flex items-center gap-1 text-xs px-2 py-1 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
      title="Reset password"
    >
      <RefreshCw className={cn('w-3 h-3', loading && 'animate-spin')} />
      {loading ? 'Resetting…' : 'Reset password'}
    </button>
  )
}

export function StaffTable({ staff, currentUserId, currentUserEmail }: StaffTableProps) {
  const [pending, setPending] = useState<string | null>(null)
  const [roleEditing, setRoleEditing] = useState<string | null>(null)

  const me = staff.find(s => s.id === currentUserId)
  const others = staff.filter(s => s.id !== currentUserId)

  async function handleRoleChange(memberId: string, newRole: Role) {
    setPending(memberId)
    await updateStaffRole(memberId, newRole)
    setRoleEditing(null)
    setPending(null)
  }

  async function handleDelete(id: string) {
    if (!confirm('Remove this user? This cannot be undone.')) return
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
                    <div className={cn('w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0', member.activated_at ? 'bg-blue-100' : 'bg-gray-100')}>
                      <span className={cn('font-semibold text-xs', member.activated_at ? 'text-blue-700' : 'text-gray-400')}>{member.full_name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{member.full_name}</p>
                      {!member.activated_at && (
                        <span className="text-xs text-amber-600 font-medium">Pending activation</span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{formatDate(member.created_at)}</td>
                <td className="px-4 py-3">
                  {roleEditing === member.id ? (
                    <select
                      autoFocus
                      defaultValue={member.role}
                      disabled={pending === member.id}
                      onChange={e => handleRoleChange(member.id, e.target.value as Role)}
                      onBlur={() => setRoleEditing(null)}
                      className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      {ROLES.map(r => (
                        <option key={r} value={r} title={ROLE_DESCRIPTIONS[r]}>
                          {ROLE_LABELS[r]}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <button
                      onClick={() => setRoleEditing(member.id)}
                      className="group flex items-center gap-1.5"
                      title="Click to change role"
                    >
                      <RoleBadge role={member.role} />
                      <span className="text-xs text-gray-300 group-hover:text-gray-500 transition-colors">▾</span>
                    </button>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <ResetPasswordButton memberId={member.id} />
                    <button
                      onClick={() => handleDelete(member.id)}
                      disabled={pending === member.id}
                      className="text-gray-400 hover:text-red-500 disabled:opacity-50 transition-colors"
                      aria-label="Remove user"
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
                  No other user accounts yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
