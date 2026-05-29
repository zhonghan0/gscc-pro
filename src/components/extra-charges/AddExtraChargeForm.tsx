'use client'

import { useState, useMemo } from 'react'
import { Check, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createExtraCharge, createChargeItem } from '@/actions/extra-charges'
import { sortChargeItems, getStoredSort } from '@/lib/charge-item-sort'

interface ChargeItem {
  id: string
  name: string
  default_price: number
  unit: string | null
  category?: string | null
}

interface ResidentPrice {
  charge_item_id: string
  price: number
}

interface Props {
  residentId: string
  chargeItems: ChargeItem[]
  residentPrices: ResidentPrice[]
  defaultBillingMonth: string  // YYYY-MM
  onDone: () => void
}

function prevMonthFirstDay(billingMonth: string): string {
  const [y, m] = billingMonth.split('-').map(Number)
  const d = new Date(y, m - 2, 1) // m-1 = current month (0-indexed), m-2 = previous
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

/** Given a YYYY-MM-DD charge date, return the billing month (next month) as YYYY-MM */
function nextMonthOf(dateStr: string): string {
  if (!dateStr) return ''
  const [y, m] = dateStr.split('-').map(Number)
  const d = new Date(y, m, 1) // month is 0-indexed, so m = next month
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** Format YYYY-MM as "June 2026" */
function formatBillingMonth(ym: string): string {
  if (!ym) return ''
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-MY', { month: 'long', year: 'numeric' })
}

/** Format YYYY-MM-DD as "10 May 2026" */
function formatChargeDate(d: string): string {
  if (!d) return ''
  return new Date(d + 'T00:00:00').toLocaleDateString('en-MY', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function AddExtraChargeForm({ residentId, chargeItems: initialChargeItems, residentPrices, defaultBillingMonth, onDone }: Props) {
  const fmtLocal = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

  const priceMap = new Map(residentPrices.map(p => [p.charge_item_id, p.price]))

  // Local copy of charge items so we can append newly created ones immediately
  const [chargeItems, setChargeItems] = useState<ChargeItem[]>(initialChargeItems)
  const sortedChargeItems = useMemo(() => sortChargeItems(chargeItems, getStoredSort()), [chargeItems])

  const [selectedItemId, setSelectedItemId] = useState<string>('__free__')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [chargeDate, setChargeDate] = useState(() => prevMonthFirstDay(defaultBillingMonth))
  const [billingMonth, setBillingMonth] = useState(defaultBillingMonth)
  const [billingMonthManuallySet, setBillingMonthManuallySet] = useState(false)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const qty = Math.max(1, parseInt(quantity) || 1)
  const unitPrice = parseFloat(amount) || 0
  const finalAmount = unitPrice * qty

  // Inline new charge item state
  const [showNewItem, setShowNewItem] = useState(false)
  const [newItemName, setNewItemName] = useState('')
  const [newItemPrice, setNewItemPrice] = useState('')
  const [newItemSaving, setNewItemSaving] = useState(false)
  const [newItemError, setNewItemError] = useState('')

  function handleChargeDateChange(newDate: string) {
    setChargeDate(newDate)
    // Auto-set billing month to next month of the charge date, unless user has overridden it manually
    if (!billingMonthManuallySet && newDate) {
      setBillingMonth(nextMonthOf(newDate))
    }
  }

  function handleBillingMonthChange(val: string) {
    setBillingMonth(val)
    setBillingMonthManuallySet(true)
  }

  function handleItemChange(id: string) {
    if (id === '__new__') {
      setShowNewItem(true)
      return
    }
    setSelectedItemId(id)
    setShowNewItem(false)
    if (id === '__free__') {
      setDescription('')
      setAmount('')
      return
    }
    const item = chargeItems.find(c => c.id === id)
    if (!item) return
    setDescription(item.name)
    const price = priceMap.get(id) ?? item.default_price
    setAmount(price > 0 ? price.toString() : '')
  }

  async function handleSaveNewItem() {
    const name = newItemName.trim()
    if (!name) { setNewItemError('Name is required'); return }
    const price = parseFloat(newItemPrice)
    if (isNaN(price) || price < 0) { setNewItemError('Enter a valid price (0 or more)'); return }

    setNewItemSaving(true)
    setNewItemError('')
    try {
      const created = await createChargeItem({
        name,
        default_price: price,
      })
      // Append to local list and auto-select
      setChargeItems(prev => [...prev, created])
      setSelectedItemId(created.id)
      setDescription(created.name)
      setAmount(price > 0 ? price.toString() : '')
      // Reset mini-form
      setShowNewItem(false)
      setNewItemName('')
      setNewItemPrice('')
    } catch (err) {
      setNewItemError(err instanceof Error ? err.message : 'Could not create item')
    } finally {
      setNewItemSaving(false)
    }
  }

  function handleCancelNewItem() {
    setShowNewItem(false)
    setNewItemName('')
    setNewItemPrice('')
    setNewItemError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!description.trim()) { setError('Description is required'); return }
    if (isNaN(unitPrice) || unitPrice <= 0) { setError('Amount must be greater than 0'); return }

    setLoading(true)
    setError('')
    try {
      await createExtraCharge({
        resident_id: residentId,
        charge_item_id: selectedItemId !== '__free__' ? selectedItemId : null,
        billing_month: billingMonth,
        charge_date: chargeDate,
        description: description.trim(),
        amount: unitPrice,
        quantity: qty,
        notes: notes.trim() || undefined,
      })
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Preset picker */}
      <div>
        <Label htmlFor="charge_item">Charge Item</Label>
        <select
          id="charge_item"
          value={showNewItem ? '__new__' : selectedItemId}
          onChange={e => handleItemChange(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="__free__">— Free text (custom) —</option>
          {sortedChargeItems.map(item => {
            const price = priceMap.get(item.id) ?? item.default_price
            return (
              <option key={item.id} value={item.id}>
                {item.name} — RM {price.toFixed(2)}
              </option>
            )
          })}
          <option value="__new__">+ New charge item…</option>
        </select>

        {/* Inline new charge item mini-form */}
        {showNewItem && (
          <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
            <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">New Charge Item</p>
            <div className="flex gap-2">
              <Input
                placeholder="Name *"
                value={newItemName}
                onChange={e => setNewItemName(e.target.value)}
                className="flex-1 h-8 text-sm"
                autoFocus
              />
              <Input
                type="number"
                placeholder="Default RM"
                min="0"
                step="0.01"
                value={newItemPrice}
                onChange={e => setNewItemPrice(e.target.value)}
                className="w-28 h-8 text-sm"
              />
              <button
                type="button"
                onClick={handleSaveNewItem}
                disabled={newItemSaving}
                className="flex items-center justify-center w-8 h-8 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 flex-shrink-0"
                title="Save new item"
              >
                {newItemSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={handleCancelNewItem}
                className="flex items-center justify-center w-8 h-8 rounded-md border border-gray-200 text-gray-400 hover:bg-gray-100 flex-shrink-0"
                title="Cancel"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            {newItemError && (
              <p className="text-xs text-red-600">{newItemError}</p>
            )}
          </div>
        )}
      </div>

      {/* Description */}
      <div>
        <Label htmlFor="description">Description *</Label>
        <Input
          id="description"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="e.g. Transport to hospital"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Amount (unit price) + Qty */}
        <div>
          <Label>Amount (RM) *</Label>
          <div className="flex items-center gap-2">
            <Input
              id="amount"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              required
              className="flex-1"
            />
            <span className="text-gray-400 text-sm flex-shrink-0">×</span>
            <Input
              id="quantity"
              type="number"
              min="1"
              step="1"
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              className="w-16 flex-shrink-0"
            />
            {qty > 1 && (
              <span className="text-sm font-semibold text-gray-700 flex-shrink-0 whitespace-nowrap">
                = RM {finalAmount.toFixed(2)}
              </span>
            )}
          </div>
        </div>

        {/* Charge date */}
        <div>
          <Label htmlFor="charge_date">
            Charge Date <span className="text-gray-400 font-normal">(when service happened)</span>
          </Label>
          <div className="relative">
            <Input
              id="charge_date"
              type="date"
              value={chargeDate}
              onChange={e => handleChargeDateChange(e.target.value)}
              className={chargeDate ? 'pr-8' : ''}
            />
            {chargeDate && (
              <button
                type="button"
                onClick={() => setChargeDate('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                title="Clear date"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Billing month — auto-advances to next month from charge date */}
      <div>
        <Label htmlFor="billing_month">Billing Month *</Label>
        <Input
          id="billing_month"
          type="month"
          value={billingMonth}
          onChange={e => handleBillingMonthChange(e.target.value)}
          required
        />
        {chargeDate && billingMonth && (
          <p className="mt-1 text-xs text-blue-600 font-medium">
            ↗ Service on {formatChargeDate(chargeDate)} → billed on <strong>{formatBillingMonth(billingMonth)}</strong> statement
            {!billingMonthManuallySet && <span className="text-gray-400 font-normal ml-1">(auto)</span>}
          </p>
        )}
        {!chargeDate && (
          <p className="mt-1 text-xs text-gray-400">Which month's statement this charge appears on.</p>
        )}
      </div>

      {/* Notes */}
      <div>
        <Label htmlFor="notes">Notes <span className="text-gray-400 font-normal">(optional)</span></Label>
        <Input
          id="notes"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Internal note…"
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>
      )}

      <div className="flex gap-3 pt-1">
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving…' : 'Add Charge'}
        </Button>
        <Button type="button" variant="outline" onClick={onDone}>Cancel</Button>
      </div>
    </form>
  )
}
