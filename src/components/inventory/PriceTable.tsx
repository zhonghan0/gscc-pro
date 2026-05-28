'use client'

import { useState } from 'react'
import { Check, Pencil, X } from 'lucide-react'
import { upsertPrice, deletePrice } from '@/actions/inventory'
import type { InventoryItem, InventorySupplier, InventoryPrice, InventoryCategory } from '@/lib/types'
import { cn } from '@/lib/utils'

const CATEGORY_ORDER: InventoryCategory[] = ['diaper', 'underpad', 'wet_wipes', 'others']
const CATEGORY_LABELS: Record<InventoryCategory, string> = {
  diaper: 'Diaper', underpad: 'Underpad', wet_wipes: 'Wet Wipes', others: 'Others',
}
const CATEGORY_BADGE: Record<InventoryCategory, string> = {
  diaper:    'bg-blue-50 text-blue-700',
  underpad:  'bg-purple-50 text-purple-700',
  wet_wipes: 'bg-teal-50 text-teal-700',
  others:    'bg-gray-50 text-gray-600',
}

interface Props {
  suppliers: Pick<InventorySupplier, 'id' | 'name'>[]
  items: Pick<InventoryItem, 'id' | 'name' | 'category' | 'unit'>[]
  prices: InventoryPrice[]
}

export function PriceTable({ suppliers, items, prices: initialPrices }: Props) {
  const [prices, setPrices] = useState(initialPrices)
  const [editing, setEditing] = useState<{ itemId: string; supplierId: string } | null>(null)
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState(false)

  function getPrice(itemId: string, supplierId: string) {
    return prices.find(p => p.item_id === itemId && p.supplier_id === supplierId)
  }

  function getMinPrice(itemId: string): number | null {
    const ps = prices.filter(p => p.item_id === itemId).map(p => p.price)
    return ps.length > 0 ? Math.min(...ps) : null
  }

  function startEdit(itemId: string, supplierId: string) {
    const existing = getPrice(itemId, supplierId)
    setEditing({ itemId, supplierId })
    setEditValue(existing ? String(existing.price) : '')
  }

  function cancelEdit() {
    setEditing(null)
    setEditValue('')
  }

  async function saveEdit() {
    if (!editing) return
    const val = parseFloat(editValue)
    if (isNaN(val) || val < 0) { cancelEdit(); return }

    setSaving(true)
    try {
      await upsertPrice({
        item_id: editing.itemId,
        supplier_id: editing.supplierId,
        price: val,
        effective_date: new Date().toISOString().split('T')[0],
      })

      setPrices(prev => {
        const idx = prev.findIndex(p => p.item_id === editing.itemId && p.supplier_id === editing.supplierId)
        if (idx >= 0) {
          const updated = [...prev]
          updated[idx] = { ...updated[idx], price: val }
          return updated
        }
        return [...prev, {
          id: crypto.randomUUID(),
          item_id: editing.itemId,
          supplier_id: editing.supplierId,
          price: val,
          effective_date: new Date().toISOString().split('T')[0],
          notes: null,
          created_at: new Date().toISOString(),
        }]
      })
    } catch (err: any) {
      alert(err.message)
    }
    setSaving(false)
    cancelEdit()
  }

  async function clearPrice(itemId: string, supplierId: string) {
    const existing = getPrice(itemId, supplierId)
    if (!existing) return
    if (!confirm('Remove this price?')) return
    try {
      await deletePrice(existing.id)
      setPrices(prev => prev.filter(p => !(p.item_id === itemId && p.supplier_id === supplierId)))
    } catch (err: any) {
      alert(err.message)
    }
  }

  if (suppliers.length === 0 || items.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="font-medium">Nothing to compare yet</p>
        <p className="text-sm mt-1">
          {suppliers.length === 0 ? 'Add suppliers first' : 'Add products first'} to start comparing prices.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">Click any cell to enter or update a price. The lowest price per product is highlighted in green.</p>

      <div className="bg-white border border-gray-200 rounded-xl overflow-auto">
        <table className="text-sm w-full min-w-max">
          <thead className="sticky top-0 bg-white border-b border-gray-200 z-10">
            <tr>
              <th className="text-left px-5 py-3 font-medium text-gray-600 min-w-[200px]">Product</th>
              {suppliers.map(s => (
                <th key={s.id} className="px-4 py-3 text-center font-medium text-gray-600 min-w-[120px]">
                  {s.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CATEGORY_ORDER.map(cat => {
              const catItems = items.filter(i => i.category === cat)
              if (catItems.length === 0) return null
              return [
                <tr key={`section-${cat}`} className="bg-gray-50">
                  <td colSpan={suppliers.length + 1} className={cn('px-5 py-2 text-xs font-semibold uppercase tracking-wider', CATEGORY_BADGE[cat])}>
                    {CATEGORY_LABELS[cat]}
                  </td>
                </tr>,
                ...catItems.map(item => {
                  const minPrice = getMinPrice(item.id)
                  return (
                    <tr key={item.id} className="border-t border-gray-100 hover:bg-gray-50/50">
                      <td className="px-5 py-3">
                        <p className="font-medium text-gray-900">{item.name}</p>
                        <p className="text-xs text-gray-400">per {item.unit}</p>
                      </td>
                      {suppliers.map(s => {
                        const priceEntry = getPrice(item.id, s.id)
                        const isEditing = editing?.itemId === item.id && editing?.supplierId === s.id
                        const isCheapest = priceEntry && minPrice !== null && priceEntry.price === minPrice && prices.filter(p => p.item_id === item.id).length > 1

                        if (isEditing) {
                          return (
                            <td key={s.id} className="px-2 py-2 text-center">
                              <div className="flex items-center gap-1 justify-center">
                                <input
                                  autoFocus
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  className="w-20 border border-blue-400 rounded px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  value={editValue}
                                  onChange={e => setEditValue(e.target.value)}
                                  onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit() }}
                                />
                                <button onClick={saveEdit} disabled={saving} className="p-1 rounded text-green-600 hover:bg-green-50">
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={cancelEdit} className="p-1 rounded text-gray-400 hover:bg-gray-100">
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          )
                        }

                        return (
                          <td key={s.id} className={cn('px-4 py-3 text-center group cursor-pointer', isCheapest && 'bg-green-50')}>
                            <div
                              className="flex items-center justify-center gap-1"
                              onClick={() => startEdit(item.id, s.id)}
                            >
                              {priceEntry ? (
                                <>
                                  <span className={cn('font-medium', isCheapest ? 'text-green-700' : 'text-gray-900')}>
                                    RM {priceEntry.price.toFixed(2)}
                                    {isCheapest && <span className="ml-1 text-xs">★</span>}
                                  </span>
                                  <button
                                    onClick={e => { e.stopPropagation(); clearPrice(item.id, s.id) }}
                                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-gray-300 hover:text-red-400 transition-all"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </>
                              ) : (
                                <span className="text-gray-200 group-hover:text-gray-400 transition-colors text-xs flex items-center gap-1">
                                  <Pencil className="w-3 h-3" /> Enter price
                                </span>
                              )}
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  )
                }),
              ]
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400">★ = cheapest option for that product</p>
    </div>
  )
}
