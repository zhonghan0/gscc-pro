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
  diaper:    'bg-blue-50 text-blue-700',
  underpad:  'bg-purple-50 text-purple-700',
  wet_wipes: 'bg-teal-50 text-teal-700',
  others:    'bg-gray-50 text-gray-600',
}

const CATEGORY_LABELS: Record<InventoryCategory, string> = {
  diaper: 'Diaper', underpad: 'Underpad', wet_wipes: 'Wet Wipes', others: 'Others',
}

type FormData = {
  category: InventoryCategory
  name: string
  unit: string
  notes: string
  brand: string
  diaper_type: 'tape' | 'pant' | ''
  size: string
  bags_per_carton: string
  pcs_per_bag: string
}

const emptyForm: FormData = {
  category: 'diaper', name: '', unit: 'carton', notes: '',
  brand: '', diaper_type: '', size: '', bags_per_carton: '', pcs_per_bag: '',
}

function unitDefault(cat: InventoryCategory) {
  if (cat === 'diaper') return 'carton'
  if (cat === 'underpad') return 'pack'
  if (cat === 'wet_wipes') return 'pack'
  return 'pcs'
}

interface Props { items: InventoryItem[] }

export function ItemManager({ items: initial }: Props) {
  const [items, setItems] = useState(initial)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<InventoryItem | null>(null)
  const [form, setForm] = useState<FormData>(emptyForm)
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
    setForm({
      category: item.category,
      name: item.name,
      unit: item.unit,
      notes: item.notes ?? '',
      brand: item.brand ?? '',
      diaper_type: item.diaper_type ?? '',
      size: item.size ?? '',
      bags_per_carton: item.bags_per_carton ? String(item.bags_per_carton) : '',
      pcs_per_bag: item.pcs_per_bag ? String(item.pcs_per_bag) : '',
    })
    setError('')
    setShowForm(true)
  }

  function setCategory(cat: InventoryCategory) {
    setForm(f => ({ ...f, category: cat, unit: unitDefault(cat) }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Name is required'); return }
    if (form.category === 'diaper' && (!form.bags_per_carton || !form.pcs_per_bag)) {
      setError('Bags/carton and Pcs/bag are required for diapers'); return
    }
    setLoading(true)
    setError('')

    const payload = {
      category: form.category,
      name: form.name.trim(),
      unit: form.unit.trim() || unitDefault(form.category),
      notes: form.notes || undefined,
      brand: form.brand || undefined,
      diaper_type: (form.diaper_type || null) as 'tape' | 'pant' | null | undefined,
      size: form.size || undefined,
      bags_per_carton: form.bags_per_carton ? parseInt(form.bags_per_carton) : null,
      pcs_per_bag: form.pcs_per_bag ? parseInt(form.pcs_per_bag) : null,
    }

    try {
      if (editing) {
        await updateItem(editing.id, payload)
        setItems(prev => prev.map(i => i.id === editing.id ? { ...i, ...payload, diaper_type: payload.diaper_type ?? null, brand: payload.brand ?? null, size: payload.size ?? null, notes: payload.notes ?? null } : i))
        setShowForm(false)
      } else {
        await createItem(payload)
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

  const isDialer = form.category === 'diaper'

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
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Category + Name row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Category *</label>
                <select
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  value={form.category}
                  onChange={e => setCategory(e.target.value as InventoryCategory)}
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
                  placeholder="e.g. Adult Diaper XL"
                />
              </div>
            </div>

            {/* Diaper-specific fields */}
            {isDialer && (
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 space-y-3">
                <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Diaper Details</p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Brand</label>
                    <input
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      value={form.brand}
                      onChange={e => setForm(f => ({ ...f, brand: e.target.value }))}
                      placeholder="e.g. Absorba, TENA"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                    <select
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      value={form.diaper_type}
                      onChange={e => setForm(f => ({ ...f, diaper_type: e.target.value as 'tape' | 'pant' | '' }))}
                    >
                      <option value="">— Select —</option>
                      <option value="tape">Tape</option>
                      <option value="pant">Pant</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Size</label>
                    <input
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      value={form.size}
                      onChange={e => setForm(f => ({ ...f, size: e.target.value }))}
                      placeholder="e.g. M, L, XL"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Bags per Carton *</label>
                    <input
                      type="number" min="1"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      value={form.bags_per_carton}
                      onChange={e => setForm(f => ({ ...f, bags_per_carton: e.target.value }))}
                      placeholder="e.g. 10"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Pcs per Bag *</label>
                    <input
                      type="number" min="1"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      value={form.pcs_per_bag}
                      onChange={e => setForm(f => ({ ...f, pcs_per_bag: e.target.value }))}
                      placeholder="e.g. 8"
                    />
                  </div>
                </div>
                {form.bags_per_carton && form.pcs_per_bag && (
                  <p className="text-xs text-blue-600 font-medium">
                    → {parseInt(form.bags_per_carton)} bags × {parseInt(form.pcs_per_bag)} pcs = <strong>{parseInt(form.bags_per_carton) * parseInt(form.pcs_per_bag)} pcs/carton</strong>
                  </p>
                )}
              </div>
            )}

            {/* Unit + Notes */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Unit *</label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.unit}
                  onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                  placeholder="e.g. carton, pack, pcs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Optional notes"
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

            // For diapers, group by type
            const renderRows = cat.value === 'diaper'
              ? [
                  { subLabel: 'Tape', rows: catItems.filter(i => i.diaper_type === 'tape') },
                  { subLabel: 'Pant', rows: catItems.filter(i => i.diaper_type === 'pant') },
                  { subLabel: 'Unspecified', rows: catItems.filter(i => !i.diaper_type) },
                ].filter(g => g.rows.length > 0)
              : [{ subLabel: null, rows: catItems }]

            return (
              <div key={cat.value} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${CATEGORY_BADGE[cat.value]}`}>
                    {cat.label}
                  </span>
                </div>
                <table className="w-full text-sm">
                  <thead className="border-b border-gray-100">
                    <tr className="text-xs text-gray-400 font-medium">
                      <th className="text-left px-5 py-2">Name</th>
                      {cat.value === 'diaper' && (
                        <>
                          <th className="text-left px-3 py-2">Brand</th>
                          <th className="text-left px-3 py-2">Type</th>
                          <th className="text-left px-3 py-2">Size</th>
                          <th className="text-left px-3 py-2">Bag/ctn</th>
                          <th className="text-left px-3 py-2">Pcs/bag</th>
                          <th className="text-left px-3 py-2">Pcs/ctn</th>
                        </>
                      )}
                      <th className="text-left px-3 py-2">Unit</th>
                      <th className="px-5 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {renderRows.map(group => [
                      group.subLabel && (
                        <tr key={`sub-${group.subLabel}`} className="bg-gray-50/60">
                          <td colSpan={10} className="px-5 py-1.5 text-xs font-semibold text-gray-500">
                            {group.subLabel}
                          </td>
                        </tr>
                      ),
                      ...group.rows.map(item => (
                        <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-5 py-3 font-medium text-gray-900">{item.name}</td>
                          {cat.value === 'diaper' && (
                            <>
                              <td className="px-3 py-3 text-gray-600">{item.brand || <span className="text-gray-300">—</span>}</td>
                              <td className="px-3 py-3">
                                {item.diaper_type ? (
                                  <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${item.diaper_type === 'tape' ? 'bg-orange-100 text-orange-700' : 'bg-indigo-100 text-indigo-700'}`}>
                                    {item.diaper_type.charAt(0).toUpperCase() + item.diaper_type.slice(1)}
                                  </span>
                                ) : <span className="text-gray-300">—</span>}
                              </td>
                              <td className="px-3 py-3 text-gray-600">{item.size || <span className="text-gray-300">—</span>}</td>
                              <td className="px-3 py-3 text-gray-600">{item.bags_per_carton ?? <span className="text-gray-300">—</span>}</td>
                              <td className="px-3 py-3 text-gray-600">{item.pcs_per_bag ?? <span className="text-gray-300">—</span>}</td>
                              <td className="px-3 py-3 text-gray-600 font-medium">
                                {item.bags_per_carton && item.pcs_per_bag
                                  ? item.bags_per_carton * item.pcs_per_bag
                                  : <span className="text-gray-300">—</span>}
                              </td>
                            </>
                          )}
                          <td className="px-3 py-3 text-gray-500 text-xs">/{item.unit}</td>
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
                      )),
                    ])}
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
