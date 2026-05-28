'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ShieldCheck, X, Check, Minus } from 'lucide-react'
import { ROLE_LABELS, ROLE_BADGE_CLASS, type Role } from '@/lib/permissions'
import { cn } from '@/lib/utils'

type Access = 'full' | 'own' | 'view' | 'none'

interface PermRow {
  section?: string   // section header (no cells)
  label: string
  owner: Access
  manager: Access
  care_staff: Access
  billing: Access
}

const PERMISSIONS: PermRow[] = [
  { section: 'Residents', label: '' , owner: 'none', manager: 'none', care_staff: 'none', billing: 'none' },
  { label: 'View residents',           owner: 'full', manager: 'full', care_staff: 'full', billing: 'full' },
  { label: 'Add / edit residents',     owner: 'full', manager: 'full', care_staff: 'none', billing: 'none' },
  { label: 'Delete residents',         owner: 'full', manager: 'full', care_staff: 'none', billing: 'none' },

  { section: 'Care Notes', label: '', owner: 'none', manager: 'none', care_staff: 'none', billing: 'none' },
  { label: 'View care notes',          owner: 'full', manager: 'full', care_staff: 'full', billing: 'none' },
  { label: 'Add care notes',           owner: 'full', manager: 'full', care_staff: 'full', billing: 'none' },
  { label: 'Edit / delete any note',   owner: 'full', manager: 'full', care_staff: 'none', billing: 'none' },

  { section: 'Billing', label: '', owner: 'none', manager: 'none', care_staff: 'none', billing: 'none' },
  { label: 'View payments',            owner: 'full', manager: 'full', care_staff: 'none', billing: 'full' },
  { label: 'Manage payments',          owner: 'full', manager: 'full', care_staff: 'none', billing: 'full' },
  { label: 'Extra charges',            owner: 'full', manager: 'full', care_staff: 'none', billing: 'full' },
  { label: 'Driver payouts',           owner: 'full', manager: 'full', care_staff: 'none', billing: 'full' },

  { section: 'Reports & Export', label: '', owner: 'none', manager: 'none', care_staff: 'none', billing: 'none' },
  { label: 'View reports',             owner: 'full', manager: 'full', care_staff: 'none', billing: 'full' },
  { label: 'Export data',              owner: 'full', manager: 'full', care_staff: 'none', billing: 'full' },

  { section: 'Workers', label: '', owner: 'none', manager: 'none', care_staff: 'none', billing: 'none' },
  { label: 'View caregivers & workers',owner: 'full', manager: 'full', care_staff: 'none', billing: 'none' },
  { label: 'Add / edit workers',       owner: 'full', manager: 'full', care_staff: 'none', billing: 'none' },
  { label: 'Import workers',           owner: 'full', manager: 'full', care_staff: 'none', billing: 'none' },

  { section: 'Administration', label: '', owner: 'none', manager: 'none', care_staff: 'none', billing: 'none' },
  { label: 'User management',          owner: 'full', manager: 'none', care_staff: 'none', billing: 'none' },
  { label: 'Master data / settings',   owner: 'full', manager: 'none', care_staff: 'none', billing: 'none' },
  { label: 'Charge items',             owner: 'full', manager: 'full', care_staff: 'none', billing: 'none' },
  { label: 'Import data',              owner: 'full', manager: 'full', care_staff: 'none', billing: 'none' },
]

const ROLES: Role[] = ['owner', 'manager', 'care_staff', 'billing']

function AccessIcon({ access }: { access: Access }) {
  if (access === 'full') return <Check className="w-4 h-4 text-green-600 mx-auto" />
  if (access === 'own')  return <span className="text-xs text-blue-600 font-medium block text-center">Own</span>
  if (access === 'view') return <span className="text-xs text-gray-500 font-medium block text-center">View</span>
  return <Minus className="w-4 h-4 text-gray-300 mx-auto" />
}

export function RolePermissionsModal() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <ShieldCheck className="w-4 h-4" /> Role Permissions
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />

          {/* Modal */}
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Role Permissions</h2>
                <p className="text-xs text-gray-500 mt-0.5">What each role can access in Care Pro</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Table */}
            <div className="overflow-auto flex-1">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white border-b border-gray-200 z-10">
                  <tr>
                    <th className="text-left px-6 py-3 font-medium text-gray-600">Feature</th>
                    {ROLES.map(role => (
                      <th key={role} className="px-3 py-3 text-center">
                        <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap inline-block', ROLE_BADGE_CLASS[role])}>
                          {ROLE_LABELS[role]}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {PERMISSIONS.map((row, i) => {
                    if (row.section) {
                      return (
                        <tr key={i} className="bg-gray-50">
                          <td colSpan={5} className="px-6 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            {row.section}
                          </td>
                        </tr>
                      )
                    }
                    return (
                      <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-6 py-2.5 text-gray-700">{row.label}</td>
                        {ROLES.map(role => (
                          <td key={role} className="px-2 py-2.5">
                            <AccessIcon access={row[role]} />
                          </td>
                        ))}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Legend */}
            <div className="px-6 py-3 border-t border-gray-100 flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1"><Check className="w-3.5 h-3.5 text-green-600" /> Allowed</span>
              <span className="flex items-center gap-1"><Minus className="w-3.5 h-3.5 text-gray-300" /> Not allowed</span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
