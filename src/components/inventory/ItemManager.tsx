'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus, Pencil, Trash2, Tag } from 'lucide-react'
import { createItem, updateItem, deleteItem } from '@/actions/inventory'
import type { InventoryItem, InventoryCategory } from '@/lib/types'

const CATEGORIES: { value: InventoryCategory; label: string }[] = [
  { value: 'diaper',    label: 'Diaper' },
  { value: 'underpad',  label: 'Underpad' },
  { value: 'wet_wipes', label: 'Wet Wipes' },
  { value: 'others',    label: 'Others' },
]

const CATEGORY_BADGE: Record<InventoryCategory, string> = {
  diaper:    'bg-blue-100 text-blue-700',
  underpad:  'bg-purple-100 text-purple-700',
  wet_wipes: 'bg-teal-100 text-teal-700',
  others:    'bg-gray-100 text-gray-600',
}

const CATEGORY_LABELS: Record<InventoryCategory, string> = {
  diaper: 'Diaper', underpad: 'Underpad', wet_wipes: 'Wet Wipes', others: 'Others',
}

const emptyForm = { category: 'diaper' as InventoryCategory, name: '', unit: 'pcs', notes: '' }

interface Props { items: InventoryItem[] }

export function ItemManager({ items: initial }: Props) {
  const [items, setItems] = useState(initial)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<InventoryItem | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)

  function openNew() {
    setEditing(null)
    setForm(emptyForm)
    setError('')
    setShowForm(true)
  }

  function openEdit(item: InventoryItem) {
    setEditing(item)
    setForm({ category: item.category, name: item.name, unit: item.unit, notes: item.notes ?? '' })
    setError('')
    setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Name is required'); return }
    if (!form.unit.trim()) { setError('Unit is required'); return }
    setLoading(true)
    setError('')
    try {
      if (editing) {
        await updateItem(editing.id, form)
        setItems(prev => prev.map(i => i.id === editing.id ? { ...i, ...form } : i))
        setShowForm(false)
      } else {
        await createItem(form)
        window.location.reload()
        return
      }
    } catch (err: any) {
      setError(err.message)
    }
    setLoading(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this product? This will also remove all its price entries.')) return
    setDeleting(id)
    try {
      await deleteItem(id)
      setItems(prev => prev.filter(i => i.id !== id))
    } catch (err: any) {
      alert(err.message)
    }
    setDeleting(null)
  }

  // Group by category for display
  const grouped = CATEGORIES.map(cat => ({
    ...cat,
    items: items.filter(i => i.category === cat.value),
  })).filter(g => g.items.length > 0 || showForm)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{items.length} product{items.length !== 1 ? 's' : ''}</p>
        <Button size="sm" onClick={openNew}>
          <Plus className="w-4 h-4" /> Add Product
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <h3 className="font-semibold text-gray-900">{editing ? 'Edit Product' : 'New Product'}</h3>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Category *</label>
                <select
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value as InventoryCategory }))}
                >
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Product Name *</label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Adult Diaper M size"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Unit *</label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.unit}
                  onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                  placeholder="e.g. pack, carton, pcs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="e.g. 10pcs per pack, M size"
                />
              </div>
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="submit" size="sm" disabled={loading}>{loading ? 'Saving…' : 'Save'}</Button>
            </div>
          </form>
        </div>
      )}

      {/* List by category */}
      {items.length === 0 && !showForm ? (
        <div className="text-center py-12 text-gray-400">
          <Tag className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No products yet. Add your first one.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {CATEGORIES.map(cat => {
            const catItems = items.filter(i => i.category === cat.value)
            if (catItems.length === 0) return null
            return (
              <div key={cat.value} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${CATEGORY_BADGE[cat.value]}`}>
                    {cat.label}
                  </span>
                </div>
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-gray-100">
                    {catItems.map(item => (
                      <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3 font-medium text-gray-900">{item.name}</td>
                        <td className="px-5 py-3 text-gray-500 text-xs">per {item.unit}</td>
                        <td className="px-5 py-3 text-gray-500 max-w-[200px] truncate">{item.notes || <span className="text-gray-300">—</span>}</td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-1 justify-end">
                            <button onClick={() => openEdit(item)} className="p-1.5 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(item.id)}
                              disabled={deleting === item.id}
                              className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
