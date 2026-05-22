'use client'

import { useState, useTransition } from 'react'
import type { Position } from '@/lib/types'
import { createPosition, updatePosition, deletePosition } from '@/actions/positions'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react'

export function PositionsManager({
  positions: initial,
  workerCounts = {},
}: {
  positions: Position[]
  workerCounts?: Record<string, number>
}) {
  const [positions, setPositions] = useState(initial)
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  async function handleAdd() {
    if (!newName.trim()) return
    setError('')
    startTransition(async () => {
      try {
        await createPosition(newName)
        setPositions(prev => [...prev, { id: crypto.randomUUID(), name: newName.trim(), created_at: new Date().toISOString() }].sort((a, b) => a.name.localeCompare(b.name)))
        setNewName('')
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to add')
      }
    })
  }

  function startEdit(p: Position) {
    setEditingId(p.id)
    setEditingName(p.name)
  }

  async function handleUpdate(id: string) {
    if (!editingName.trim()) return
    setError('')
    startTransition(async () => {
      try {
        await updatePosition(id, editingName)
        setPositions(prev => prev.map(p => p.id === id ? { ...p, name: editingName.trim() } : p).sort((a, b) => a.name.localeCompare(b.name)))
        setEditingId(null)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to update')
      }
    })
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete position "${name}"? Workers with this position will be unaffected.`)) return
    setError('')
    startTransition(async () => {
      try {
        await deletePosition(id)
        setPositions(prev => prev.filter(p => p.id !== id))
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to delete')
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-1">Manage Positions</h3>
        <p className="text-sm text-gray-500 mb-5">Add, rename or remove job positions for local workers.</p>

        {/* Add new */}
        <div className="flex gap-2 mb-6">
          <Input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="e.g. Care Assistant, Nurse, Cook"
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAdd())}
          />
          <Button onClick={handleAdd} disabled={isPending || !newName.trim()} className="flex-shrink-0">
            <Plus className="w-4 h-4" /> Add
          </Button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2 mb-4">
            {error}
          </div>
        )}

        {/* List */}
        {positions.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No positions yet. Add one above.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {positions.map(p => (
              <li key={p.id} className="flex items-center gap-3 py-3">
                {editingId === p.id ? (
                  <>
                    <Input
                      value={editingName}
                      onChange={e => setEditingName(e.target.value)}
                      className="flex-1 h-8 text-sm"
                      autoFocus
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleUpdate(p.id)
                        if (e.key === 'Escape') setEditingId(null)
                      }}
                    />
                    <button
                      onClick={() => handleUpdate(p.id)}
                      disabled={isPending}
                      className="text-green-600 hover:text-green-700"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-gray-600">
                      <X className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm text-gray-900">{p.name}</span>
                    {(workerCounts[p.id] ?? 0) > 0 ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                        {workerCounts[p.id]}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-400">
                        0
                      </span>
                    )}
                    <button
                      onClick={() => startEdit(p)}
                      className="text-gray-400 hover:text-blue-600 transition-colors"
                      title="Rename"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(p.id, p.name)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
