'use client'

import { useState, useTransition } from 'react'
import { Pencil, Trash2, Check, X, Plus } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { upsertResidentChargePrice, deleteResidentChargePrice } from '@/actions/extra-charges'

interface ChargeItem {
  id: string
  name: string
  default_price: number
  unit: string | null
}

interface ResidentPrice {
  charge_item_id: string
  price: number
}

interface Props {
  residentId: string
  chargeItems: ChargeItem[]
  residentPrices: ResidentPrice[]
  isAdmin: boolean
}

export function ResidentCustomPrices({ residentId, chargeItems, residentPrices, isAdmin }: Props) {
  const priceMap = new Map(residentPrices.map(p => [p.charge_item_id, p.price]))
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editPrice, setEditPrice] = useState('')
  const [addingId, setAddingId] = useState<string | null>(null)
  const [addPrice, setAddPrice] = useState('')
  const [, startTransition] = useTransition()

  // Items that don't yet have a custom price
  const unoverridden = chargeItems.filter(c => !priceMap.has(c.id))

  function saveEdit(chargeItemId: string) {
    const price = parseFloat(editPrice)
    if (isNaN(price) || price < 0) return
    startTransition(async () => {
      await upsertResidentChargePrice(residentId, chargeItemId, price)
      setEditingId(null)
    })
  }

  function saveAdd() {
    if (!addingId) return
    const price = parseFloat(addPrice)
    if (isNaN(price) || price < 0) return
    startTransition(async () => {
      await upsertResidentChargePrice(residentId, addingId, price)
      setAddingId(null)
      setAddPrice('')
    })
  }

  function handleDelete(chargeItemId: string) {
    startTransition(async () => {
      await deleteResidentChargePrice(residentId, chargeItemId)
    })
  }

  const overrides = chargeItems.filter(c => priceMap.has(c.id))

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">
        Custom prices override the default for this resident. Items without an override use the default price.
      </p>

      {overrides.length === 0 && !addingId && (
        <p className="text-sm text-gray-400 italic">No custom prices set — all items use default prices.</p>
      )}

      {overrides.length > 0 && (
        <div className="rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-3 py-2 font-medium text-gray-600">Item</th>
                <th className="text-left px-3 py-2 font-medium text-gray-600">Default</th>
                <th className="text-left px-3 py-2 font-medium text-gray-600">Custom Price</th>
                {isAdmin && <th className="w-16" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {overrides.map(item => {
                const customPrice = priceMap.get(item.id)!
                return (
                  <tr key={item.id} className={editingId === item.id ? 'bg-blue-50' : ''}>
                    <td className="px-3 py-2 text-gray-900">{item.name}</td>
                    <td className="px-3 py-2 text-gray-400 text-xs">RM {item.default_price.toFixed(2)}</td>
                    <td className="px-3 py-2">
                      {editingId === item.id ? (
                        <Input
                          className="h-7 text-sm w-28"
                          type="number"
                          min="0"
                          step="0.01"
                          value={editPrice}
                          onChange={e => setEditPrice(e.target.value)}
                          autoFocus
                        />
                      ) : (
                        <span className="font-medium text-blue-700">RM {customPrice.toFixed(2)}</span>
                      )}
                    </td>
                    {isAdmin && (
                      <td className="px-2 py-2">
                        {editingId === item.id ? (
                          <div className="flex gap-1">
                            <button onClick={() => saveEdit(item.id)} className="p-1 text-green-600 hover:bg-green-50 rounded"><Check className="w-3.5 h-3.5" /></button>
                            <button onClick={() => setEditingId(null)} className="p-1 text-gray-400 hover:bg-gray-100 rounded"><X className="w-3.5 h-3.5" /></button>
                          </div>
                        ) : (
                          <div className="flex gap-1">
                            <button onClick={() => { setEditingId(item.id); setEditPrice(customPrice.toString()) }} className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"><Pencil className="w-3.5 h-3.5" /></button>
                            <button onClick={() => handleDelete(item.id)} className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add override */}
      {isAdmin && unoverridden.length > 0 && (
        addingId ? (
          <div className="flex items-center gap-2 text-sm">
            <select
              value={addingId}
              onChange={e => {
                setAddingId(e.target.value)
                const item = chargeItems.find(c => c.id === e.target.value)
                if (item) setAddPrice(item.default_price.toString())
              }}
              className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {unoverridden.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <span className="text-gray-500">RM</span>
            <Input
              className="h-8 w-28 text-sm"
              type="number"
              min="0"
              step="0.01"
              value={addPrice}
              onChange={e => setAddPrice(e.target.value)}
              autoFocus
            />
            <button onClick={saveAdd} className="p-1.5 text-green-600 hover:bg-green-50 rounded"><Check className="w-4 h-4" /></button>
            <button onClick={() => setAddingId(null)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded"><X className="w-4 h-4" /></button>
          </div>
        ) : (
          <button
            onClick={() => {
              setAddingId(unoverridden[0].id)
              setAddPrice(unoverridden[0].default_price.toString())
            }}
            className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            <Plus className="w-3.5 h-3.5" /> Add custom price
          </button>
        )
      )}
    </div>
  )
}
