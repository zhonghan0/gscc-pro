'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { Resident } from '@/lib/types'
import { createPayment, updatePayment } from '@/actions/payments'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { ChevronUp, ChevronDown } from 'lucide-react'

interface PaymentData {
  id: string
  resident_id: string | null
  payment_date: string
  amount: number
  payment_method: string
  payer_name: string | null
  reference: string | null
  description: string | null
  notes: string | null
  for_month?: string | null
  full_payment?: boolean | null
}

interface ResidentHint {
  fee: number | null
  payerName: string | null
  paymentMethod: string | null
  suggestedForMonth: string
}

interface Props {
  residents: Pick<Resident, 'id' | 'full_name'>[]
  payment?: PaymentData
  residentHints?: Record<string, ResidentHint>
  defaultResidentId?: string
  expectedAmount?: number | null
}

const PAYMENT_METHODS = [
  { value: 'duitnow', label: 'DuitNow' },
  { value: 'giro', label: 'Giro/IBG' },
  { value: 'cash', label: 'Cash' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'fpx', label: 'FPX' },
  { value: 'meps', label: 'Instant Transfer (MEPS)' },
  { value: 'online_banking', label: 'Online Banking' },
  { value: 'other', label: 'Other' },
]

export function PaymentForm({ residents, payment, residentHints, defaultResidentId, expectedAmount }: Props) {
  const router = useRouter()
  const isEdit = !!payment
  const formRef = useRef<HTMLFormElement>(null)

  const today = new Date()
  const todayISO = today.toISOString().slice(0, 10)

  /** Returns YYYY-MM-01 for a given YYYY-MM string, or falls back to 1st of current month */
  function firstOfMonth(ym: string | null | undefined): string {
    if (ym && /^\d{4}-\d{2}$/.test(ym)) return `${ym}-01`
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`
  }

  /** Format a Date using local calendar (avoids UTC shift from toISOString) */
  function fmtLocalDate(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  function shiftDate(delta: number) {
    if (!paymentDate) return
    const [y, m, d] = paymentDate.split('-').map(Number)
    const date = new Date(y, m - 1, d)
    date.setDate(date.getDate() + delta)
    setPaymentDate(fmtLocalDate(date))
    markDirty()
  }

  // Pre-select resident from query param (grid + button) or from existing payment (edit)
  const initialResidentId = payment?.resident_id ?? defaultResidentId ?? ''
  const initialHint = initialResidentId ? residentHints?.[initialResidentId] : undefined

  // For edit mode with no for_month recorded, fall back to the payment's own month
  const initialForMonth =
    payment?.for_month ??
    initialHint?.suggestedForMonth ??
    (payment?.payment_date ? payment.payment_date.slice(0, 7) : '')

  const [residentId, setResidentId] = useState(initialResidentId)
  const [forMonth, setForMonth] = useState(initialForMonth)
  // Payment date: use existing date when editing; otherwise default to 1st of for_month
  const [paymentDate, setPaymentDate] = useState(payment?.payment_date?.slice(0, 10) ?? firstOfMonth(initialForMonth))
  const [amount, setAmount] = useState(payment?.amount?.toString() ?? (initialHint?.fee != null ? initialHint.fee.toString() : ''))
  const [method, setMethod] = useState(payment?.payment_method ?? initialHint?.paymentMethod ?? 'duitnow')
  const [payerName, setPayerName] = useState(payment?.payer_name ?? initialHint?.payerName ?? '')
  const [reference, setReference] = useState(payment?.reference ?? '')
  const [description, setDescription] = useState(payment?.description ?? '')
  const [notes, setNotes] = useState(payment?.notes ?? '')

  const [fullPayment, setFullPayment] = useState<boolean | null>(payment?.full_payment ?? null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isDirty, setDirty] = useState(false)
  const [showExitConfirm, setShowExitConfirm] = useState(false)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName

      if (e.key === 'Enter' && !e.shiftKey) {
        // Let textarea use Enter for newlines; inputs/selects already submit natively,
        // but handle all other cases (focus on button, body, etc.)
        if (tag === 'TEXTAREA') return
        if (tag === 'INPUT' || tag === 'SELECT') return // browser default handles it
        e.preventDefault()
        formRef.current?.requestSubmit()
        return
      }

      if (e.key === 'Escape') {
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
          ;(e.target as HTMLElement).blur()
        }
        e.preventDefault()
        if (isDirty) setShowExitConfirm(true)
        else router.back()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isDirty, router])

  function handleCancel() {
    if (isDirty) setShowExitConfirm(true)
    else router.back()
  }

  function markDirty() { setDirty(true) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!forMonth) {
      setError('Please select a "For Month" — it is required')
      return
    }
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount greater than 0')
      return
    }
    setLoading(true)
    setError('')

    const data = {
      resident_id: residentId || null,
      payment_date: paymentDate,
      amount: parseFloat(amount),
      payment_method: method,
      payer_name: payerName || null,
      reference: reference || null,
      description: description || null,
      notes: notes || null,
      for_month: forMonth || null,
      full_payment: fullPayment,
    }

    try {
      if (isEdit) {
        await updatePayment(payment.id, data)
      } else {
        await createPayment(data)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  return (
    <>
      {showExitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4 space-y-4">
            <h2 className="font-semibold text-gray-900">Unsaved changes</h2>
            <p className="text-sm text-gray-600">You have unsaved changes. What would you like to do?</p>
            <div className="flex flex-col gap-2">
              <Button type="button" onClick={() => { setShowExitConfirm(false); formRef.current?.requestSubmit() }}>
                Save changes
              </Button>
              <Button type="button" variant="outline" onClick={() => { setShowExitConfirm(false); router.back() }}>
                Discard &amp; leave
              </Button>
              <Button type="button" variant="ghost" onClick={() => setShowExitConfirm(false)}>
                Keep editing
              </Button>
            </div>
          </div>
        </div>
      )}

      <form ref={formRef} onSubmit={handleSubmit} onChange={markDirty} className="space-y-5">
        {/* Resident */}
        <div>
          <Label htmlFor="resident">Resident</Label>
          <select
            id="resident"
            value={residentId}
            onChange={e => {
              const id = e.target.value
              setResidentId(id)
              if (id && residentHints?.[id]) {
                const h = residentHints[id]
                if (h.fee != null) setAmount(h.fee.toString())
                if (h.payerName) setPayerName(h.payerName)
                if (h.paymentMethod) setMethod(h.paymentMethod)
                setForMonth(h.suggestedForMonth)
                if (!payment) setPaymentDate(firstOfMonth(h.suggestedForMonth))
              }
              markDirty()
            }}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">— Unassigned —</option>
            {residents.map(r => (
              <option key={r.id} value={r.id}>{r.full_name}</option>
            ))}
          </select>
        </div>

        {/* Payment Date */}
        <div>
          <Label htmlFor="payment_date">Payment Date *</Label>
          <div className="flex items-center gap-2">
            <div className="flex flex-col rounded-md border border-gray-300 overflow-hidden">
              <button
                type="button"
                onClick={() => shiftDate(+1)}
                className="flex items-center justify-center w-6 h-5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 border-b border-gray-300 transition-colors"
                title="Next day"
              >
                <ChevronUp className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => shiftDate(-1)}
                className="flex items-center justify-center w-6 h-5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                title="Previous day"
              >
                <ChevronDown className="w-3 h-3" />
              </button>
            </div>
            <Input
              id="payment_date"
              type="date"
              required
              value={paymentDate}
              onChange={e => { setPaymentDate(e.target.value); markDirty() }}
            />
            <button
              type="button"
              onClick={() => { setPaymentDate(todayISO); markDirty() }}
              className="flex-shrink-0 px-2.5 py-1.5 text-xs font-medium rounded-md border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors whitespace-nowrap"
            >
              Today
            </button>
          </div>
        </div>

        {/* For Month */}
        <div>
          <Label htmlFor="for_month">For Month *</Label>
          <Input
            id="for_month"
            type="month"
            required
            value={forMonth}
            onChange={e => {
              const ym = e.target.value
              setForMonth(ym)
              if (!payment) setPaymentDate(firstOfMonth(ym))
              markDirty()
            }}
          />
          <p className="mt-1 text-xs text-gray-400">The billing month this payment covers. Required.</p>
        </div>

        {/* Amount */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <Label htmlFor="amount">Amount (RM) *</Label>
            {expectedAmount != null && (
              <span className="text-xs text-gray-400">
                Expected: RM {expectedAmount.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
              </span>
            )}
          </div>
          <Input
            id="amount"
            type="number"
            required
            min="0.01"
            step="0.01"
            placeholder="0.00"
            value={amount}
            onChange={e => { setAmount(e.target.value); markDirty() }}
          />
        </div>

        {/* Full Payment */}
        <div>
          <label className="flex items-center gap-3 cursor-pointer select-none group">
            <div className="relative">
              <input
                type="checkbox"
                checked={fullPayment === true}
                onChange={e => { setFullPayment(e.target.checked ? true : null); markDirty() }}
                className="w-4 h-4 rounded accent-blue-600 cursor-pointer"
              />
            </div>
            <div>
              <span className="text-sm font-medium text-gray-700">Mark as full payment</span>
              <p className="text-xs text-gray-400 mt-0.5">
                Override — mark this payment as fully settled regardless of amount
              </p>
            </div>
          </label>
        </div>

        {/* Payment Method */}
        <div>
          <Label htmlFor="payment_method">Payment Method *</Label>
          <select
            id="payment_method"
            required
            value={method}
            onChange={e => { setMethod(e.target.value); markDirty() }}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {PAYMENT_METHODS.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>

        {/* Payer Name */}
        <div>
          <Label htmlFor="payer_name">Payer Name</Label>
          <Input
            id="payer_name"
            type="text"
            placeholder="Name on bank transfer"
            value={payerName}
            onChange={e => { setPayerName(e.target.value); markDirty() }}
          />
        </div>

        {/* Reference */}
        <div>
          <Label htmlFor="reference">Reference</Label>
          <Input
            id="reference"
            type="text"
            placeholder="Bank reference number"
            value={reference}
            onChange={e => { setReference(e.target.value); markDirty() }}
          />
        </div>

        {/* Description */}
        <div>
          <Label htmlFor="description">Description</Label>
          <Input
            id="description"
            type="text"
            placeholder="e.g. May 2026 Fee"
            value={description}
            onChange={e => { setDescription(e.target.value); markDirty() }}
          />
        </div>

        {/* Notes */}
        <div>
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            rows={3}
            placeholder="Internal notes…"
            value={notes}
            onChange={e => { setNotes(e.target.value); markDirty() }}
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-gray-200">
          <div className="flex items-center gap-3">
            <Button type="button" variant="ghost" onClick={handleCancel}>Cancel</Button>
            <span className="text-xs text-gray-400">Esc to cancel</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 hidden sm:block">
              <kbd className="font-mono bg-gray-100 border border-gray-200 rounded px-1">Enter</kbd> to save
            </span>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving…' : isEdit ? 'Save Changes' : 'Save Payment'}
            </Button>
          </div>
        </div>
      </form>
    </>
  )
}
