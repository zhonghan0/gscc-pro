'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus, Pencil, Trash2, Building2, Phone, User } from 'lucide-react'
import { createSupplier, updateSupplier, deleteSupplier } from '@/actions/inventory'
import type { InventorySupplier } from '@/lib/types'

interface Props { suppliers: InventorySupplier[] }

const empty = { name: '', contact_person: '', phone: '', notes: '' }

export function SupplierManager({ suppliers: initial }: Props) {
  const [suppliers, setSuppliers] = useState(initial)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<InventorySupplier | null>(null)
  const [form, setForm] = useState(empty)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)

  function openNew() {
    setEditing(null)
    setForm(empty)
    setError('')
    setShowForm(true)
  }

  function openEdit(s: InventorySupplier) {
    setEditing(s)
    setForm({ name: s.name, contact_person: s.contact_person ?? '', phone: s.phone ?? '', notes: s.notes ?? '' })
    setError('')
    setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Name is required'); return }
    setLoading(true)
    setError('')
    try {
      if (editing) {
        await updateSupplier(editing.id, form)
        setSuppliers(prev => prev.map(s => s.id === editing.id ? { ...s, ...form } : s))
      } else {
        await createSupplier(form)
        // reload via revalidatePath — page will re-fetch; optimistically add
        window.location.reload()
        return
      }
      setShowForm(false)
    } catch (err: any) {
      setError(err.message)
    }
    setLoading(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this supplier? This will also remove all price entries for this supplier.')) return
    setDeleting(id)
    try {
      await deleteSupplier(id)
      setSuppliers(prev => prev.filter(s => s.id !== id))
    } catch (err: any) {
      alert(err.message)
    }
    setDeleting(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{suppliers.length} supplier{suppliers.length !== 1 ? 's' : ''}</p>
        <Button size="sm" onClick={openNew}>
          <Plus className="w-4 h-4" /> Add Supplier
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <h3 className="font-semibold text-gray-900">{editing ? 'Edit Supplier' : 'New Supplier'}</h3>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Company Name *</label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. ABC Medical Supplies"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Contact Person</label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.contact_person}
                  onChange={e => setForm(f => ({ ...f, contact_person: e.target.value }))}
                  placeholder="Name"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="e.g. 012-3456789"
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

      {/* Table */}
      {suppliers.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Building2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No suppliers yet. Add your first one.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Company</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Contact</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Phone</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Notes</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {suppliers.map(s => (
                <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 font-medium text-gray-900">{s.name}</td>
                  <td className="px-5 py-3 text-gray-600">
                    {s.contact_person ? (
                      <span className="flex items-center gap-1"><User className="w-3.5 h-3.5 text-gray-400" />{s.contact_person}</span>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-5 py-3 text-gray-600">
                    {s.phone ? (
                      <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-gray-400" />{s.phone}</span>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-5 py-3 text-gray-500 max-w-[200px] truncate">{s.notes || <span className="text-gray-300">—</span>}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => openEdit(s)} className="p-1.5 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(s.id)}
                        disabled={deleting === s.id}
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
      )}
    </div>
  )
}
