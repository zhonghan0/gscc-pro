'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { Check, X, Loader2, Tag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createExtraCharge, createChargeItem } from '@/actions/extra-charges'
import { sortChargeItems, getStoredSort } from '@/lib/charge-item-sort'
import { cn } from '@/lib/utils'

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
  const d = new Date(y, m - 2, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

function nextMonthOf(dateStr: string): string {
  if (!dateStr) return ''
  const [y, m] = dateStr.split('-').map(Number)
  const d = new Date(y, m, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function formatBillingMonth(ym: string): string {
  if (!ym) return ''
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-MY', { month: 'long', year: 'numeric' })
}

function formatChargeDate(d: string): string {
  if (!d) return ''
  return new Date(d + 'T00:00:00').toLocaleDateString('en-MY', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function AddExtraChargeForm({ residentId, chargeItems: initialChargeItems, residentPrices, defaultBillingMonth, onDone }: Props) {
  const priceMap = new Map(residentPrices.map(p => [p.charge_item_id, p.price]))

  // Local copy so newly created items appear immediately
  const [chargeItems, setChargeItems] = useState<ChargeItem[]>(initialChargeItems)
  const sortedChargeItems = useMemo(() => sortChargeItems(chargeItems, getStoredSort()), [chargeItems])

  // ── Combobox ─────────────────────────────────────────────────────────────────
  const [description, setDescription] = useState('')
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [highlightIdx, setHighlightIdx] = useState(0)
  const comboRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Filter charge items by what's typed
  const filtered = useMemo(() => {
    const q = description.trim().toLowerCase()
    if (!q) return sortedChargeItems
    return sortedChargeItems.filter(item => item.name.toLowerCase().includes(q))
  }, [description, sortedChargeItems])

  // Show "save as new item" option when text doesn't exactly match any item
  const canCreateNew = description.trim().length > 0 &&
    !chargeItems.some(item => item.name.toLowerCase() === description.trim().toLowerCase())

  // Click outside → close dropdown
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (comboRef.current && !comboRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [])

  function handleDescChange(val: string) {
    setDescription(val)
    setSelectedItemId(null)   // deselect linked item when user edits
    setHighlightIdx(0)
    setShowDropdown(true)
  }

  function selectItem(item: ChargeItem) {
    setDescription(item.name)
    setSelectedItemId(item.id)
    const price = priceMap.get(item.id) ?? item.default_price
    setAmount(price > 0 ? price.toString() : '')
    setShowDropdown(false)
    setHighlightIdx(0)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showDropdown) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setShowDropdown(true) }
      return
    }
    const total = filtered.length + (canCreateNew ? 1 : 0)
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightIdx(h => Math.min(h + 1, total - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIdx(h => Math.max(h - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (highlightIdx < filtered.length && filtered[highlightIdx]) {
        selectItem(filtered[highlightIdx])
      } else if (canCreateNew) {
        handleSaveNewItem()
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false)
    }
  }

  // ── Other form fields ────────────────────────────────────────────────────────
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

  function handleChargeDateChange(newDate: string) {
    setChargeDate(newDate)
    if (!billingMonthManuallySet && newDate) setBillingMonth(nextMonthOf(newDate))
  }

  function handleBillingMonthChange(val: string) {
    setBillingMonth(val)
    setBillingMonthManuallySet(true)
  }

  // ── Inline "save as new charge item" ─────────────────────────────────────────
  const [newItemPrice, setNewItemPrice] = useState('')
  const [showNewItemPrice, setShowNewItemPrice] = useState(false)
  const [newItemSaving, setNewItemSaving] = useState(false)
  const [newItemError, setNewItemError] = useState('')

  async function handleSaveNewItem() {
    const name = description.trim()
    if (!name) return
    const price = parseFloat(newItemPrice)
    if (showNewItemPrice && (isNaN(price) || price < 0)) {
      setNewItemError('Enter a valid price (0 or more)')
      return
    }
    setNewItemSaving(true)
    setNewItemError('')
    try {
      const created = await createChargeItem({
        name,
        default_price: showNewItemPrice ? price : 0,
      })
      setChargeItems(prev => [...prev, created])
      setSelectedItemId(created.id)
      if (showNewItemPrice && price > 0) setAmount(price.toString())
      setShowDropdown(false)
      setShowNewItemPrice(false)
      setNewItemPrice('')
    } catch (err) {
      setNewItemError(err instanceof Error ? err.message : 'Could not create item')
    } finally {
      setNewItemSaving(false)
    }
  }

  // ── Submit ────────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!description.trim()) { setError('Description is required'); return }
    if (isNaN(unitPrice) || unitPrice <= 0) { setError('Amount must be greater than 0'); return }

    setLoading(true)
    setError('')
    try {
      await createExtraCharge({
        resident_id: residentId,
        charge_item_id: selectedItemId ?? null,
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

  const linkedItem = selectedItemId ? chargeItems.find(c => c.id === selectedItemId) : null

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">

      {/* ── Description combobox ─────────────────────────────────────────────── */}
      <div>
        <Label htmlFor="description">Description *</Label>
        <div ref={comboRef} className="relative">
          <input
            ref={inputRef}
            id="description"
            type="text"
            autoComplete="off"
            value={description}
            onChange={e => handleDescChange(e.target.value)}
            onFocus={() => setShowDropdown(true)}
            onKeyDown={handleKeyDown}
            placeholder="Type to search charge items or enter custom…"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 pr-8"
          />
          {description && (
            <button
              type="button"
              onClick={() => { setDescription(''); setSelectedItemId(null); setShowDropdown(false); inputRef.current?.focus() }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              tabIndex={-1}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Dropdown */}
          {showDropdown && (filtered.length > 0 || canCreateNew) && (
            <ul className="absolute z-30 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
              {filtered.map((item, i) => {
                const price = priceMap.get(item.id) ?? item.default_price
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onMouseDown={e => { e.preventDefault(); selectItem(item) }}
                      className={cn(
                        'w-full flex items-center justify-between px-3 py-2 text-sm transition-colors',
                        i === highlightIdx
                          ? 'bg-blue-50 text-blue-800'
                          : 'hover:bg-gray-50 text-gray-800'
                      )}
                    >
                      <span className="font-medium">{item.name}</span>
                      <span className="text-xs text-gray-400 tabular-nums ml-3 flex-shrink-0">
                        RM {price.toFixed(2)}
                      </span>
                    </button>
                  </li>
                )
              })}
              {/* Save as new charge item */}
              {canCreateNew && (
                <li className="border-t border-gray-100">
                  {!showNewItemPrice ? (
                    <button
                      type="button"
                      onMouseDown={e => { e.preventDefault(); setShowNewItemPrice(true); setHighlightIdx(filtered.length) }}
                      className={cn(
                        'w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors text-blue-600',
                        highlightIdx === filtered.length ? 'bg-blue-50' : 'hover:bg-blue-50'
                      )}
                    >
                      <Tag className="w-3.5 h-3.5 flex-shrink-0" />
                      Save &quot;{description.trim()}&quot; as new charge item…
                    </button>
                  ) : (
                    <div className="px-3 py-2 space-y-1.5">
                      <p className="text-xs font-medium text-blue-700">Default price for &quot;{description.trim()}&quot;</p>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          placeholder="RM 0.00"
                          min="0"
                          step="0.01"
                          value={newItemPrice}
                          onChange={e => setNewItemPrice(e.target.value)}
                          className="flex-1 h-7 text-sm"
                          autoFocus
                          onKeyDown={e => {
                            if (e.key === 'Enter') { e.preventDefault(); handleSaveNewItem() }
                            if (e.key === 'Escape') { setShowNewItemPrice(false) }
                          }}
                        />
                        <button
                          type="button"
                          onClick={handleSaveNewItem}
                          disabled={newItemSaving}
                          className="flex items-center justify-center w-7 h-7 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 flex-shrink-0"
                        >
                          {newItemSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowNewItemPrice(false)}
                          className="flex items-center justify-center w-7 h-7 rounded border border-gray-200 text-gray-400 hover:bg-gray-100 flex-shrink-0"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      {newItemError && <p className="text-xs text-red-600">{newItemError}</p>}
                    </div>
                  )}
                </li>
              )}
            </ul>
          )}
        </div>

        {/* Linked charge item badge */}
        {linkedItem && (
          <p className="mt-1 flex items-center gap-1 text-xs text-blue-600">
            <Tag className="w-3 h-3" />
            Linked to <span className="font-medium">{linkedItem.name}</span>
            <button
              type="button"
              onClick={() => setSelectedItemId(null)}
              className="ml-0.5 text-gray-400 hover:text-gray-600"
              tabIndex={-1}
              title="Unlink charge item"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </p>
        )}
      </div>

      {/* ── Amount + Qty  /  Charge Date ─────────────────────────────────────── */}
      {/* Labels in row 1, inputs in row 2 — keeps inputs at the same height  */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        {/* Labels row */}
        <Label>Amount (RM) *</Label>
        <Label htmlFor="charge_date">
          Charge Date <span className="text-gray-400 font-normal">(when service happened)</span>
        </Label>

        {/* Inputs row */}
        <div className="flex items-center gap-2">
          <Input
            id="amount"
            type="number"
            min="0.01"
            step="0.01"
            placeholder="0.00"
            value={amount}
            onChange={e => setAmount(e.target.value)}
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

      {/* ── Billing month ─────────────────────────────────────────────────────── */}
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
          <p className="mt-1 text-xs text-gray-400">Which month&apos;s statement this charge appears on.</p>
        )}
      </div>

      {/* ── Notes ────────────────────────────────────────────────────────────── */}
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
