'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { X, Pencil, ArrowLeftRight, Plus } from 'lucide-react'

interface ResidentRow {
  id: string
  full_name: string
  pay_day: number | null
  fee: number | null
  admission_date: string | null
  status?: string
}

interface PaymentRow {
  id: string
  resident_id: string | null
  payment_date: string
  for_month: string | null
  amount: number
  payment_method: string
}

interface Props {
  residents: ResidentRow[]
  payments: PaymentRow[]
  highlightId?: string | null
}

const METHOD_LABELS: Record<string, string> = {
  duitnow: 'DuitNow', giro: 'Giro', cash: 'Cash', cheque: 'Cheque',
  fpx: 'FPX', meps: 'Instant Transfer', online_banking: 'Online Banking', other: 'Other',
}

/** Returns months oldest-first: `pastCount` months back through current month, plus `futureCount` months ahead */
function buildMonthRange(pastCount: number, futureCount = 0): string[] {
  const months: string[] = []
  const now = new Date()
  for (let i = pastCount - 1; i >= -futureCount; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return months
}

/** Format YYYY-MM as "Jan 26" */
function fmtMonth(ym: string): string {
  const [y, m] = ym.split('-')
  const d = new Date(parseInt(y), parseInt(m) - 1, 1)
  return d.toLocaleDateString('en-MY', { month: 'short', year: '2-digit' })
}

/** Format YYYY-MM-DD as "21/2" (day/month, no leading zeros) */
function fmtCell(dateStr: string): string {
  const day = parseInt(dateStr.slice(8, 10))
  const month = parseInt(dateStr.slice(5, 7))
  return `${day}/${month}`
}

/** Format YYYY-MM-DD as "21 Feb 2026" */
function fmtFull(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })
}

const GRID_ORDER_KEY = 'payments_grid_reversed'

export function PaymentsCalendar({ residents, payments, highlightId }: Props) {
  const router = useRouter()
  const tableRef = useRef<HTMLDivElement>(null)
  const [activeHighlight, setActiveHighlight] = useState(highlightId ?? null)

  // Scroll highlighted cell into view inside the overflow container
  useEffect(() => {
    if (!highlightId || !tableRef.current) return
    const cell = tableRef.current.querySelector('[data-highlight="true"]') as HTMLElement | null
    if (cell) {
      cell.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' })
    }
  }, [highlightId])

  // Auto-clear the highlight from URL after 3 s (clean up address bar)
  useEffect(() => {
    if (!highlightId) return
    const t = setTimeout(() => {
      setActiveHighlight(null)
      router.replace('/payments')
    }, 3000)
    return () => clearTimeout(t)
  }, [highlightId, router])

  const [reversed, setReversed] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem(GRID_ORDER_KEY) === 'true'
  })

  function toggleReversed() {
    setReversed(prev => {
      const next = !prev
      localStorage.setItem(GRID_ORDER_KEY, String(next))
      return next
    })
  }
  const baseMonths = buildMonthRange(18, 2)
  const months = reversed ? [...baseMonths].reverse() : baseMonths
  // currentMonth stays as today regardless of the future columns added
  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const [selected, setSelected] = useState<{ payment: PaymentRow; resident: ResidentRow; isLate: boolean } | null>(null)

  // Sort residents by name
  const sorted = [...residents].sort((a, b) =>
    a.full_name.localeCompare(b.full_name)
  )

  // Build lookup: residentId → month → earliest payment
  const lookup = new Map<string, Map<string, PaymentRow>>()
  for (const p of payments) {
    if (!p.resident_id) continue
    const pm = p.for_month ?? p.payment_date.slice(0, 7)
    const resMap = lookup.get(p.resident_id) ?? new Map<string, PaymentRow>()
    const existing = resMap.get(pm)
    if (!existing || p.payment_date < existing.payment_date) {
      resMap.set(pm, p)
    }
    lookup.set(p.resident_id, resMap)
  }

  // Build resident lookup for the detail panel
  const residentById = new Map(residents.map(r => [r.id, r]))

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <button
          onClick={toggleReversed}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
        >
          <ArrowLeftRight className="w-3.5 h-3.5" />
          {reversed ? 'Latest first' : 'Oldest first'}
        </button>
      </div>

      <div ref={tableRef} className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-220px)] rounded-xl border border-gray-200 bg-white">
        <table className="text-xs border-collapse" style={{ minWidth: `${40 + months.length * 56}px` }}>
          <thead className="sticky top-0 z-20">
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="sticky left-0 z-30 bg-gray-50 border-r border-gray-200 px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap min-w-[160px]">
                Resident
              </th>
              {months.map(m => (
                <th key={m} className="w-14 px-1 py-2 text-center font-medium text-gray-500 whitespace-nowrap">
                  {fmtMonth(m)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sorted.map(resident => {
              const resMap = lookup.get(resident.id)
              const admissionMonth = resident.admission_date?.slice(0, 7) ?? null

              // Last paid month for this resident (to avoid showing + in historical gaps)
              const paidMonths = resMap ? Array.from(resMap.keys()).sort() : []
              const lastPaidMonth = paidMonths.at(-1) ?? null

              // First unpaid month AFTER the last payment (trailing edge only, up to current month)
              // Historical gaps between payments are intentional — no + button there
              const firstUnpaidMonth = baseMonths.find(m => {
                if (admissionMonth && m < admissionMonth) return false
                if (m > currentMonth) return false
                if (lastPaidMonth && m <= lastPaidMonth) return false
                return !resMap?.get(m)
              }) ?? null

              // First unpaid FUTURE month — only shown when all past/current months are clear
              // Must use baseMonths (always chronological), not months (can be reversed)
              const firstUnpaidFutureMonth = firstUnpaidMonth === null
                ? (baseMonths.find(m => {
                    if (m <= currentMonth) return false
                    if (admissionMonth && m < admissionMonth) return false
                    return !resMap?.get(m)
                  }) ?? null)
                : null

              return (
                <tr key={resident.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="sticky left-0 z-10 bg-white border-r border-gray-200 px-3 py-1.5 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/residents/${resident.id}`}
                        className={`font-medium hover:text-blue-600 transition-colors ${
                          resident.status === 'discharged' ? 'text-gray-400' : 'text-gray-900'
                        }`}
                      >
                        {resident.full_name}
                      </Link>
                      {resident.status === 'discharged' && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-400">
                          Discharged
                        </span>
                      )}
                    </div>
                  </td>
                  {months.map(month => {
                    const payment = resMap?.get(month)
                    const isPast = month < currentMonth
                    const isCurrent = month === currentMonth
                    const beforeAdmission = admissionMonth ? month < admissionMonth : false

                    if (beforeAdmission) {
                      return <td key={month} className="w-14 px-1 py-1.5" />
                    }

                    if (payment) {
                      const paymentYM = payment.payment_date.slice(0, 7)
                      // Late = paid in a month AFTER the billing month; same month = on time
                      const isLate = paymentYM > month
                      const isNew = payment.id === activeHighlight
                      const cellClass = isLate
                        ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                        : 'bg-green-100 text-green-800 hover:bg-green-200'
                      return (
                        <td key={month} className="w-14 px-0.5 py-1 text-center">
                          <button
                            onClick={() => setSelected({ payment, resident, isLate })}
                            data-highlight={isNew ? 'true' : undefined}
                            className={`w-full rounded py-1 px-0.5 transition-colors cursor-pointer
                              ${cellClass}
                              ${isNew ? 'ring-2 ring-blue-500 font-extrabold shadow-sm' : 'font-semibold'}`}
                            title={`${resident.full_name} — ${fmtFull(payment.payment_date)}`}
                          >
                            {fmtCell(payment.payment_date)}
                          </button>
                        </td>
                      )
                    }

                    // First unpaid month → show + button
                    if (month === firstUnpaidMonth) {
                      return (
                        <td key={month} className="w-14 px-0.5 py-1 text-center bg-red-50">
                          <Link
                            href={`/payments/new?resident_id=${resident.id}&for_month=${month}`}
                            className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-500 hover:bg-red-200 hover:text-red-700 transition-colors"
                            title={`Add payment for ${resident.full_name} — ${fmtMonth(month)}`}
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </Link>
                        </td>
                      )
                    }

                    if (isPast) {
                      return (
                        <td
                          key={month}
                          className="w-14 px-1 py-1.5 text-center bg-red-50 text-red-200"
                          title={`Unpaid for ${fmtMonth(month)}`}
                        >
                          —
                        </td>
                      )
                    }

                    // First unpaid future month (all current/past clear) → white + button
                    if (month === firstUnpaidFutureMonth) {
                      return (
                        <td key={month} className="w-14 px-0.5 py-1 text-center">
                          <Link
                            href={`/payments/new?resident_id=${resident.id}&for_month=${month}`}
                            className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white border border-gray-200 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                            title={`Add advance payment for ${resident.full_name} — ${fmtMonth(month)}`}
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </Link>
                        </td>
                      )
                    }

                    return (
                      <td
                        key={month}
                        className="w-14 px-1 py-1.5 text-center text-gray-200"
                        title={isCurrent ? 'Current month — not yet paid' : 'Future month'}
                      >
                        ·
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600 px-1">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-green-100 border border-green-200" />
          On time
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-amber-100 border border-amber-200" />
          Late
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-red-50 border border-red-200" />
          Unpaid
        </span>
      </div>

      {/* Detail popover */}
      {selected && (() => {
        const { payment, resident, isLate } = selected
        const statusColor = isLate ? 'text-amber-700 bg-amber-50' : 'text-green-700 bg-green-50'
        const statusLabel = isLate ? 'Late' : 'On time'
        const forMonth = payment.for_month
          ? fmtMonth(payment.for_month)
          : fmtMonth(payment.payment_date.slice(0, 7))
        return (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setSelected(null)}
            />
            {/* Card */}
            <div className="fixed bottom-6 right-6 z-50 w-72 bg-white rounded-2xl shadow-xl border border-gray-200 p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="font-semibold text-gray-900 text-sm leading-tight">{resident.full_name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{forMonth}</p>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="p-1 rounded-md text-gray-400 hover:bg-gray-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Paid on</span>
                  <span className="font-medium text-gray-900">{fmtFull(payment.payment_date)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Amount</span>
                  <span className="font-semibold text-green-700">
                    RM {Number(payment.amount).toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Method</span>
                  <span className="text-gray-800">{METHOD_LABELS[payment.payment_method] ?? payment.payment_method}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Status</span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor}`}>{statusLabel}</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100">
                <Link
                  href={`/payments/${payment.id}/edit`}
                  onClick={() => setSelected(null)}
                  className="flex items-center justify-center gap-2 w-full text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg py-2 transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit this payment
                </Link>
              </div>
            </div>
          </>
        )
      })()}
    </div>
  )
}
