'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus, Trash2, ShoppingCart } from 'lucide-react'
import { createOrder } from '@/actions/inventory'
import type { InventoryItem, InventorySupplier, InventoryCategory } from '@/lib/types'
import { useRouter } from 'next/navigation'

const CATEGORY_LABELS: Record<InventoryCategory, string> = {
  diaper: 'Diaper', underpad: 'Underpad', wet_wipes: 'Wet Wipes', others: 'Others',
}

interface LineItem {
  key: number
  item_id: string
  quantity: number
  unit_price: number
}

interface Props {
  suppliers: Pick<InventorySupplier, 'id' | 'name'>[]
  items: Pick<InventoryItem, 'id' | 'name' | 'category' | 'unit'>[]
  prices: { item_id: string; supplier_id: string; price: number }[]
}

export function NewOrderForm({ suppliers, items, prices }: Props) {
  const router = useRouter()
  const [supplierId, setSupplierId] = useState('')
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<LineItem[]>([{ key: 0, item_id: '', quantity: 1, unit_price: 0 }])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  let keyCounter = 1

  function getKnownPrice(itemId: string, supId: string) {
    return prices.find(p => p.item_id === itemId && p.supplier_id === supId)?.price ?? null
  }

  function addLine() {
    setLines(prev => [...prev, { key: Date.now() + keyCounter++, item_id: '', quantity: 1, unit_price: 0 }])
  }

  function removeLine(key: number) {
    setLines(prev => prev.filter(l => l.key !== key))
  }

  function updateLine(key: number, field: string, value: string | number) {
    setLines(prev => prev.map(l => {
      if (l.key !== key) return l
      const updated = { ...l, [field]: value }
      // Auto-fill price when item changes and supplier is known
      if (field === 'item_id' && supplierId) {
        const known = getKnownPrice(value as string, supplierId)
        if (known !== null) updated.unit_price = known
      }
      return updated
    }))
  }

  // When supplier changes, auto-fill prices for existing line items
  function handleSupplierChange(newSupplierId: string) {
    setSupplierId(newSupplierId)
    setLines(prev => prev.map(l => {
      if (!l.item_id) return l
      const known = getKnownPrice(l.item_id, newSupplierId)
      return known !== null ? { ...l, unit_price: known } : l
    }))
  }

  const total = lines.reduce((sum, l) => sum + l.quantity * l.unit_price, 0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!supplierId) { setError('Please select a supplier'); return }
    const validLines = lines.filter(l => l.item_id && l.quantity > 0)
    if (validLines.length === 0) { setError('Add at least one item'); return }
    if (validLines.some(l => l.unit_price <= 0)) { setError('All items must have a price'); return }

    setLoading(true)
    setError('')
    try {
      await createOrder({
        order_date: orderDate,
        supplier_id: supplierId,
        notes: notes || undefined,
        items: validLines.map(l => ({ item_id: l.item_id, quantity: l.quantity, unit_price: l.unit_price })),
      })
    } catch (err: any) {
      if (!err.message?.includes('NEXT_REDIRECT')) {
        setError(err.message)
        setLoading(false)
      }
    }
  }

  const selectedItems = new Set(lines.map(l => l.item_id).filter(Boolean))

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      {/* Order header */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <h3 className="font-semibold text-gray-900">Order Details</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Supplier *</label>
            <select
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              value={supplierId}
              onChange={e => handleSupplierChange(e.target.value)}
            >
              <option value="">Select supplier…</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Order Date *</label>
            <input
              type="date"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={orderDate}
              onChange={e => setOrderDate(e.target.value)}
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
            <input
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Optional notes for this order"
            />
          </div>
        </div>
      </div>

      {/* Line items */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Items</h3>
          <button type="button" onClick={addLine} className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 font-medium">
            <Plus className="w-3.5 h-3.5" /> Add item
          </button>
        </div>

        <div className="space-y-2">
          <div className="grid grid-cols-[1fr_80px_100px_32px] gap-2 text-xs font-medium text-gray-500 px-1">
            <span>Product</span><span className="text-center">Qty</span><span className="text-center">Unit Price (RM)</span><span />
          </div>
          {lines.map(line => {
            const item = items.find(i => i.id === line.item_id)
            return (
              <div key={line.key} className="grid grid-cols-[1fr_80px_100px_32px] gap-2 items-center">
                <select
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  value={line.item_id}
                  onChange={e => updateLine(line.key, 'item_id', e.target.value)}
                >
                  <option value="">Select product…</option>
                  {(['diaper','underpad','wet_wipes','others'] as InventoryCategory[]).map(cat => {
                    const catItems = items.filter(i => i.category === cat)
                    if (catItems.length === 0) return null
                    return (
                      <optgroup key={cat} label={CATEGORY_LABELS[cat]}>
                        {catItems.map(i => (
                          <option key={i.id} value={i.id} disabled={selectedItems.has(i.id) && i.id !== line.item_id}>
                            {i.name}
                          </option>
                        ))}
                      </optgroup>
                    )
                  })}
                </select>
                <input
                  type="number" min="1"
                  className="border border-gray-200 rounded-lg px-2 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={line.quantity}
                  onChange={e => updateLine(line.key, 'quantity', parseInt(e.target.value) || 1)}
                />
                <input
                  type="number" min="0" step="0.01"
                  className="border border-gray-200 rounded-lg px-2 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={line.unit_price || ''}
                  onChange={e => updateLine(line.key, 'unit_price', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                />
                <button
                  type="button"
                  onClick={() => removeLine(line.key)}
                  disabled={lines.length === 1}
                  className="p-1.5 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-30"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )
          })}
        </div>

        <div className="border-t border-gray-100 pt-3 flex items-center justify-between">
          <span className="text-sm text-gray-500">{lines.filter(l => l.item_id).length} item(s)</span>
          <span className="font-semibold text-gray-900">Total: RM {total.toFixed(2)}</span>
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        <Button type="submit" disabled={loading}>
          <ShoppingCart className="w-4 h-4" />
          {loading ? 'Saving…' : 'Create Order'}
        </Button>
      </div>
    </form>
  )
}
