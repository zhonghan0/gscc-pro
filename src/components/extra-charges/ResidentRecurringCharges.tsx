'use client'

import { useState, useTransition } from 'react'
import { Plus, Trash2, Check, X, RefreshCw, ToggleLeft, ToggleRight } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  createRecurringCharge,
  updateRecurringCharge,
  deleteRecurringCharge,
  applyRecurringCharges,
} from '@/actions/recurring-charges'

interface ChargeItem {
  id: string
  name: string
  default_price: number
}

interface ResidentPrice {
  charge_item_id: string
  price: number
}

interface RecurringCharge {
  id: string
  charge_item_id: string | null
  description: string
  amount: number
  active: boolean
}

interface Props {
  residentId: string
  billingMonth: string     // currently viewed month — used for Apply button
  chargeItems: ChargeItem[]
  residentPrices: ResidentPrice[]
  recurringCharges: RecurringCharge[]
  appliedIds: Set<string>  // recurring IDs already applied this month
  onApplied: () => void    // triggers router.refresh()
}

export function ResidentRecurringCharges({
  residentId, billingMonth, chargeItems, residentPrices,
  recurringCharges, appliedIds, onApplied,
}: Props) {
  const [, startTransition] = useTransition()
  const [items, setItems] = useState(recurringCharges)
  const [adding, setAdding] = useState(false)
  const [addItemId, setAddItemId] = useState('__free__')
  const [addDesc, setAddDesc] = useState('')
  const [addAmount, setAddAmount] = useState('')
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState('')

  const priceMap = new Map(residentPrices.map(p => [p.charge_item_id, p.price]))

  const unapplied = items.filter(r => r.active && !appliedIds.has(r.id))

  function handleAddItemChange(id: string) {
    setAddItemId(id)
    if (id === '__free__') { setAddDesc(''); setAddAmount(''); return }
    const item = chargeItems.find(c => c.id === id)
    if (!item) return
    setAddDesc(item.name)
    const price = priceMap.get(id) ?? item.default_price
    setAddAmount(price > 0 ? price.toString() : '')
  }

  function saveAdd() {
    if (!addDesc.trim()) { setError('Description required'); return }
    const amt = parseFloat(addAmount)
    if (isNaN(amt) || amt < 0) { setError('Enter a valid amount'); return }
    setError('')
    startTransition(async () => {
      try {
        await createRecurringCharge({
          resident_id: residentId,
          charge_item_id: addItemId !== '__free__' ? addItemId : null,
          description: addDesc.trim(),
          amount: amt,
          sort_order: items.length,
        })
        setAdding(false)
        setAddItemId('__free__')
        setAddDesc('')
        setAddAmount('')
      } catch (e) { setError(e instanceof Error ? e.message : 'Error') }
    })
  }

  function toggleActive(item: RecurringCharge) {
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, active: !i.active } : i))
    startTransition(async () => {
      try { await updateRecurringCharge(item.id, { active: !item.active }) }
      catch (e) { setError(e instanceof Error ? e.message : 'Error') }
    })
  }

  function handleDelete(id: string) {
    setItems(prev => prev.filter(i => i.id !== id))
    startTransition(async () => {
      try { await deleteRecurringCharge(id) }
      catch (e) { setError(e instanceof Error ? e.message : 'Error') }
    })
  }

  async function handleApply() {
    setApplying(true)
    setError('')
    try {
      await applyRecurringCharges(residentId, billingMonth)
      onApplied()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setApplying(false)
    }
  }

  return (
    <div className="space-y-3">
      {/* List */}
      {items.length === 0 && !adding ? (
        <p className="text-sm text-gray-400 italic">No recurring charges set up yet.</p>
      ) : (
        <div className="rounded-lg border border-gray-200 overflow-hidden bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-3 py-2 font-medium text-gray-600">Description</th>
                <th className="text-right px-3 py-2 font-medium text-gray-600 w-24">Amount</th>
                <th className="text-center px-3 py-2 font-medium text-gray-600 w-16">Active</th>
                <th className="text-center px-3 py-2 font-medium text-gray-600 w-16">Applied</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map(item => {
                const isApplied = appliedIds.has(item.id)
                return (
                  <tr key={item.id} className={!item.active ? 'opacity-40' : ''}>
                    <td className="px-3 py-2 text-gray-900">{item.description}</td>
                    <td className="px-3 py-2 text-right text-gray-700 tabular-nums">
                      RM {Number(item.amount).toFixed(2)}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        onClick={() => toggleActive(item)}
                        className="text-gray-400 hover:text-blue-600 transition-colors"
                        title={item.active ? 'Disable' : 'Enable'}
                      >
                        {item.active
                          ? <ToggleRight className="w-5 h-5 text-blue-500" />
                          : <ToggleLeft className="w-5 h-5" />}
                      </button>
                    </td>
                    <td className="px-3 py-2 text-center">
                      {isApplied
                        ? <span className="text-xs text-green-600 font-medium">✓ Done</span>
                        : <span className="text-xs text-gray-300">—</span>}
                    </td>
                    <td className="px-2 py-2">
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add row */}
      {adding && (
        <div className="bg-white border border-gray-200 rounded-lg p-3 space-y-2">
          <select
            value={addItemId}
            onChange={e => handleAddItemChange(e.target.value)}
            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
          >
            <option value="__free__">— Free text —</option>
            {chargeItems.map(item => (
              <option key={item.id} value={item.id}>
                {item.name} — RM {(priceMap.get(item.id) ?? item.default_price).toFixed(2)}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <Input
              placeholder="Description *"
              value={addDesc}
              onChange={e => setAddDesc(e.target.value)}
              className="flex-1 h-8 text-sm"
              autoFocus
            />
            <Input
              type="number"
              placeholder="RM"
              min="0"
              step="0.01"
              value={addAmount}
              onChange={e => setAddAmount(e.target.value)}
              className="w-24 h-8 text-sm"
            />
            <button
              onClick={saveAdd}
              className="flex items-center justify-center w-8 h-8 rounded-md bg-orange-500 text-white hover:bg-orange-600 flex-shrink-0"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => { setAdding(false); setError('') }}
              className="flex items-center justify-center w-8 h-8 rounded-md border border-gray-200 text-gray-400 hover:bg-gray-100 flex-shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}

      {/* Actions */}
      <div className="flex items-center gap-2">
        {!adding && (
          <button
            onClick={() => { setAdding(true); setError('') }}
            className="flex items-center gap-1.5 text-xs text-orange-600 hover:text-orange-700 font-medium"
          >
            <Plus className="w-3.5 h-3.5" /> Add recurring charge
          </button>
        )}
        {unapplied.length > 0 && (
          <button
            onClick={handleApply}
            disabled={applying}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${applying ? 'animate-spin' : ''}`} />
            {applying ? 'Applying…' : `Apply ${unapplied.length} to ${billingMonth}`}
          </button>
        )}
        {unapplied.length === 0 && items.some(i => i.active) && (
          <span className="ml-auto text-xs text-green-600 font-medium">✓ All applied for {billingMonth}</span>
        )}
      </div>
    </div>
  )
}
