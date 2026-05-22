'use client'

import { useState, useTransition, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, Pencil, Trash2, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { deletePayment } from '@/actions/payments'
import { formatDate } from '@/lib/utils'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PaymentRow = any

const METHOD_LABELS: Record<string, string> = {
  duitnow: 'DuitNow',
  giro: 'Giro',
  cash: 'Cash',
  cheque: 'Cheque',
  fpx: 'FPX',
  meps: 'Instant Transfer',
  online_banking: 'Online Banking',
  other: 'Other',
}

const METHOD_COLORS: Record<string, string> = {
  duitnow: 'bg-blue-50 text-blue-700',
  giro: 'bg-purple-50 text-purple-700',
  cash: 'bg-green-50 text-green-700',
  cheque: 'bg-yellow-50 text-yellow-700',
  fpx: 'bg-orange-50 text-orange-700',
  meps: 'bg-cyan-50 text-cyan-700',
  online_banking: 'bg-indigo-50 text-indigo-700',
  other: 'bg-gray-50 text-gray-600',
}

function formatAmount(amount: number): string {
  return `RM ${amount.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function DeleteCell({ payment, isAdmin }: { payment: PaymentRow; isAdmin: boolean }) {
  const [confirm, setConfirm] = useState(false)
  const [pending, startTransition] = useTransition()

  if (!isAdmin) return null

  if (!confirm) {
    return (
      <button
        onClick={() => setConfirm(true)}
        className="inline-flex items-center justify-center w-7 h-7 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
        title="Delete"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    )
  }

  return (
    <span className="flex items-center gap-1 text-xs">
      <button
        disabled={pending}
        onClick={() => startTransition(() => deletePayment(payment.id))}
        className="text-red-600 hover:underline font-medium disabled:opacity-50"
      >
        {pending ? '…' : 'Yes'}
      </button>
      <span className="text-gray-300">·</span>
      <button onClick={() => setConfirm(false)} className="text-gray-500 hover:underline">No</button>
    </span>
  )
}

type SortKey = 'date' | 'resident' | 'amount'
type SortDir = 'asc' | 'desc'

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ArrowUpDown className="w-3.5 h-3.5 text-gray-300 ml-1 inline" />
  return sortDir === 'asc'
    ? <ArrowUp className="w-3.5 h-3.5 text-blue-500 ml-1 inline" />
    : <ArrowDown className="w-3.5 h-3.5 text-blue-500 ml-1 inline" />
}

interface Props {
  payments: PaymentRow[]
  isAdmin: boolean
}

export function PaymentsTable({ payments, isAdmin }: Props) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === 'a' || e.key === 'A') { e.preventDefault(); router.push('/payments/new') }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [router])

  function handleSort(col: SortKey) {
    if (col === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(col); setSortDir(col === 'date' ? 'desc' : 'asc') }
  }

  const filtered = payments
    .filter(p => {
      const q = search.toLowerCase()
      const resident = (p.residents?.full_name ?? '').toLowerCase()
      const payer = (p.payer_name ?? '').toLowerCase()
      const ref = (p.reference ?? '').toLowerCase()
      return resident.includes(q) || payer.includes(q) || ref.includes(q)
    })
    .sort((a, b) => {
      let cmp = 0
      if (sortKey === 'date') cmp = (a.payment_date ?? '').localeCompare(b.payment_date ?? '')
      else if (sortKey === 'resident') cmp = (a.residents?.full_name ?? '').localeCompare(b.residents?.full_name ?? '')
      else if (sortKey === 'amount') cmp = (a.amount ?? 0) - (b.amount ?? 0)
      return sortDir === 'asc' ? cmp : -cmp
    })

  const totalAmount = filtered.reduce((sum, p) => sum + (p.amount ?? 0), 0)

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Search by resident, payer or reference…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Keyboard hints */}
      <p className="text-xs text-gray-400 select-none">
        <kbd className="font-mono">A</kbd> Add new
      </p>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-sm text-gray-400">No payments found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th
                    onClick={() => handleSort('date')}
                    className="text-left px-4 py-3 font-medium text-gray-600 cursor-pointer select-none whitespace-nowrap hover:text-gray-900"
                  >
                    Date
                    <SortIcon col="date" sortKey={sortKey} sortDir={sortDir} />
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">For Month</th>
                  <th
                    onClick={() => handleSort('resident')}
                    className="text-left px-4 py-3 font-medium text-gray-600 cursor-pointer select-none whitespace-nowrap hover:text-gray-900 min-w-[140px]"
                  >
                    Resident
                    <SortIcon col="resident" sortKey={sortKey} sortDir={sortDir} />
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 min-w-[160px]">Payer Name</th>
                  <th
                    onClick={() => handleSort('amount')}
                    className="text-right px-4 py-3 font-medium text-gray-600 cursor-pointer select-none whitespace-nowrap hover:text-gray-900"
                  >
                    Amount
                    <SortIcon col="amount" sortKey={sortKey} sortDir={sortDir} />
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Method</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Source</th>
                  {isAdmin && <th className="px-2 py-3 w-20" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(payment => (
                  <tr key={payment.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-xs">
                      {formatDate(payment.payment_date)}
                    </td>
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap text-xs">
                      {payment.for_month
                        ? new Date(payment.for_month + '-01').toLocaleDateString('en-MY', { month: 'short', year: '2-digit' })
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                      {payment.residents?.full_name
                        ? <Link href={`/residents/${payment.resident_id}`} className="hover:text-blue-600 transition-colors">{payment.residents.full_name}</Link>
                        : <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700">Unassigned</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-gray-700 max-w-[180px] truncate">
                      {payment.payer_name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-green-700 whitespace-nowrap">
                      {formatAmount(payment.amount)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${METHOD_COLORS[payment.payment_method] ?? 'bg-gray-50 text-gray-600'}`}>
                        {METHOD_LABELS[payment.payment_method] ?? payment.payment_method}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {payment.source === 'bank_import'
                        ? <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">Imported</span>
                        : <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">Manual</span>
                      }
                    </td>
                    {isAdmin && (
                      <td className="px-2 py-3">
                        <div className="flex items-center gap-1">
                          <Link
                            href={`/payments/${payment.id}/edit`}
                            className="inline-flex items-center justify-center w-7 h-7 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Link>
                          <DeleteCell payment={payment} isAdmin={isAdmin} />
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">{filtered.length} of {payments.length} payments</p>
        <p className="text-sm font-semibold text-green-700">
          Total: {formatAmount(totalAmount)}
        </p>
      </div>
    </div>
  )
}
