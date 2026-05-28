'use client'

import { useState } from 'react'
import { Check, X, Loader2, Pencil } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { updateSetting } from '@/actions/settings'

interface SettingRow {
  key: string
  value: string
  label: string
  description: string | null
  category: string
  updated_at: string
}

interface Props {
  settings: SettingRow[]
}

function fmtDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}

const CATEGORY_ORDER = [
  'Driver Payouts',
  'Extra Charges',
  'Reports',
  'Export',
  'Users',
  'Care Logs',
  'General',
]

function groupByCategory(settings: SettingRow[]): Map<string, SettingRow[]> {
  const map = new Map<string, SettingRow[]>()
  for (const s of settings) {
    const arr = map.get(s.category) ?? []
    arr.push(s)
    map.set(s.category, arr)
  }
  return map
}

export function MasterDataManager({ settings }: Props) {
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Local overrides after save (so UI updates without full page refresh)
  const [overrides, setOverrides] = useState<Record<string, string>>({})

  const grouped = groupByCategory(settings)
  const categories = CATEGORY_ORDER.filter(c => grouped.has(c))
  // Any category not in the order list goes at the end
  for (const c of Array.from(grouped.keys())) {
    if (!CATEGORY_ORDER.includes(c)) categories.push(c)
  }

  function startEdit(row: SettingRow) {
    setEditingKey(row.key)
    setEditValue(overrides[row.key] ?? row.value)
    setError('')
  }

  function cancelEdit() {
    setEditingKey(null)
    setError('')
  }

  async function saveEdit(key: string) {
    const trimmed = editValue.trim()
    if (trimmed === '') { setError('Value cannot be empty'); return }
    if (isNaN(parseFloat(trimmed))) { setError('Must be a number'); return }
    setSaving(true)
    setError('')
    try {
      await updateSetting(key, trimmed)
      setOverrides(prev => ({ ...prev, [key]: trimmed }))
      setEditingKey(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-8">
      {categories.map(category => {
        const rows = grouped.get(category)!
        return (
          <section key={category}>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{category}</h2>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden divide-y divide-gray-100">
              {rows.map(row => {
                const displayValue = overrides[row.key] ?? row.value
                const isEditing = editingKey === row.key
                return (
                  <div key={row.key} className={`px-5 py-4 flex items-start gap-4 ${isEditing ? 'bg-yellow-50' : 'hover:bg-gray-50'}`}>
                    {/* Label + description */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{row.label}</p>
                      {row.description && (
                        <p className="text-xs text-gray-400 mt-0.5">{row.description}</p>
                      )}
                      <p className="text-xs text-gray-300 mt-1">key: <code className="font-mono">{row.key}</code> · updated {fmtDate(row.updated_at)}</p>
                    </div>

                    {/* Value / edit */}
                    <div className="flex items-center gap-2 shrink-0">
                      {isEditing ? (
                        <>
                          <Input
                            type="number"
                            step="any"
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') saveEdit(row.key)
                              if (e.key === 'Escape') cancelEdit()
                            }}
                            className="h-8 w-28 text-sm"
                            autoFocus
                          />
                          <button
                            onClick={() => saveEdit(row.key)}
                            disabled={saving}
                            className="flex items-center justify-center w-8 h-8 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                            title="Save"
                          >
                            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="flex items-center justify-center w-8 h-8 rounded border border-gray-200 text-gray-500 hover:bg-gray-100"
                            title="Cancel"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <>
                          <span className="text-base font-semibold text-gray-900 tabular-nums min-w-12 text-right">
                            {displayValue}
                          </span>
                          <button
                            onClick={() => startEdit(row)}
                            className="flex items-center justify-center w-8 h-8 rounded text-gray-300 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
            {/* Show error below the section that is being edited */}
            {error && rows.some(r => r.key === editingKey) && (
              <p className="text-xs text-red-600 mt-1 px-1">{error}</p>
            )}
          </section>
        )
      })}
    </div>
  )
}
