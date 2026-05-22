'use client'

import { useState } from 'react'
import type { Profile } from '@/lib/types'
import { updateStaffRole, deleteStaff } from '@/actions/staff'
import { formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'

interface StaffTableProps {
  staff: Profile[]
  currentUserId: string
}

export function StaffTable({ staff, currentUserId }: StaffTableProps) {
  const [pending, setPending] = useState<string | null>(null)

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
          {staff.map(member => (
            <tr key={member.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-700 font-semibold text-xs">
                      {member.full_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{member.full_name}</p>
                    {member.id === currentUserId && (
                      <p className="text-xs text-gray-400">(you)</p>
                    )}
                  </div>
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
                    disabled={pending === member.id || member.id === currentUserId}
                    onClick={() => handleRoleToggle(member)}
                  >
                    {pending === member.id ? '…' : member.role === 'admin' ? 'Make Staff' : 'Make Admin'}
                  </Button>
                  {member.id !== currentUserId && (
                    <button
                      onClick={() => handleDelete(member.id)}
                      disabled={pending === member.id}
                      className="text-gray-400 hover:text-red-500 disabled:opacity-50 transition-colors"
                      aria-label="Remove staff"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
