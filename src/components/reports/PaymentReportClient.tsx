'use client'

import { useMemo, useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { CheckCircle2, AlertCircle, XCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

type Resident = {
  id: string
  full_name: string
  fee: number | null
  admission_date: string
  date_of_discharge: string | null
  status: 'active' | 'discharged'
}

type Payment = {
  id: string
  resident_id: string | null
  for_month: string | null
  amount: number
  payment_date: string | null
  full_payment: boolean | null
}

type ExtraCharge = {
  resident_id: string
  billing_month: string
  amount: number
}

type PayStatus = 'full' | 'partial' | 'unpaid'

function formatMonth(ym: string) {
  const [y, m] = ym.split('-')
  return new Date(Number(y), Number(m) - 1, 1).toLocaleString('en-MY', { month: 'short', year: '2-digit' })
}

function prevMonth(ym: string) {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 2, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function nextMonth(ym: string) {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function currentYM() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function lastNMonths(n: number): string[] {
  const result: string[] = []
  const now = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    result.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return result
}

// Determine if a resident is eligible for billing in a given month
function isEligible(r: Resident, ym: string): boolean {
  if (r.admission_date > ym + '-31') return false          // not yet admitted
  if (r.date_of_discharge && r.date_of_discharge < ym + '-01') return false  // discharged before month
  return true
}

function computeStatus(
  resident: Resident,
  ym: string,
  paymentsByResidentMonth: Map<string, Payment>,
  extraChargesMap: Map<string, number>,
): PayStatus {
  const payment = paymentsByResidentMonth.get(`${resident.id}::${ym}`)
  if (!payment) return 'unpaid'
  if (payment.full_payment === true) return 'full'
  const fee = resident.fee ?? null
  if (fee === null) return 'partial'
  const extras = extraChargesMap.get(`${resident.id}::${ym}`) ?? 0
  const expected = fee + extras
  return payment.amount >= expected ? 'full' : 'partial'
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  iconClass,
  valueClass,
}: {
  label: string
  value: number | string
  sub?: string
  icon: React.ElementType
  iconClass: string
  valueClass?: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-4">
      <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0', iconClass)}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className={cn('text-2xl font-bold mt-0.5', valueClass ?? 'text-gray-900')}>{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

export function PaymentReportClient({
  residents,
  payments,
  extraCharges,
}: {
  residents: Resident[]
  payments: Payment[]
  extraCharges: ExtraCharge[]
}) {
  const thisMonth = currentYM()
  const [selectedMonth, setSelectedMonth] = useState(thisMonth)

  // ── Pre-build lookup maps ────────────────────────────────────────────────
  // One payment per resident per month (latest/only)
  const paymentsByResidentMonth = useMemo(() => {
    const map = new Map<string, Payment>()
    for (const p of payments) {
      if (!p.for_month || !p.resident_id) continue
      const key = `${p.resident_id}::${p.for_month}`
      // keep first encountered (payments are ordered by for_month desc, so just set)
      if (!map.has(key)) map.set(key, p)
    }
    return map
  }, [payments])

  const extraChargesMap = useMemo(() => {
    const map = new Map<string, number>()
    for (const e of extraCharges) {
      const key = `${e.resident_id}::${e.billing_month}`
      map.set(key, (map.get(key) ?? 0) + e.amount)
    }
    return map
  }, [extraCharges])

  // ── Eligible residents for selected month (active only, admitted by month) ─
  const eligible = useMemo(
    () => residents.filter(r => r.status === 'active' && isEligible(r, selectedMonth)),
    [residents, selectedMonth],
  )

  // ── Per-resident status for selected month ───────────────────────────────
  const residentStatuses = useMemo(() => {
    return eligible.map(r => ({
      r,
      status: computeStatus(r, selectedMonth, paymentsByResidentMonth, extraChargesMap),
      payment: paymentsByResidentMonth.get(`${r.id}::${selectedMonth}`) ?? null,
    }))
  }, [eligible, selectedMonth, paymentsByResidentMonth, extraChargesMap])

  const fullList    = residentStatuses.filter(x => x.status === 'full')
  const partialList = residentStatuses.filter(x => x.status === 'partial')
  const unpaidList  = residentStatuses.filter(x => x.status === 'unpaid')

  const totalCollected = residentStatuses.reduce((s, x) => s + (x.payment?.amount ?? 0), 0)
  const collectionRate = eligible.length === 0 ? 0 : Math.round((fullList.length / eligible.length) * 100)

  // ── Chart data: last 12 months ───────────────────────────────────────────
  const chartMonths = useMemo(() => lastNMonths(12), [])
  const chartData = useMemo(() => {
    return chartMonths.map(ym => {
      const elig = residents.filter(r => r.status === 'active' && isEligible(r, ym))
      let full = 0, partial = 0, unpaid = 0
      for (const r of elig) {
        const s = computeStatus(r, ym, paymentsByResidentMonth, extraChargesMap)
        if (s === 'full') full++
        else if (s === 'partial') partial++
        else unpaid++
      }
      return { month: formatMonth(ym), full, partial, unpaid }
    })
  }, [chartMonths, residents, paymentsByResidentMonth, extraChargesMap])

  const canGoNext = selectedMonth < thisMonth

  return (
    <div className="space-y-6 max-w-5xl">

      {/* ── Month Selector ── */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setSelectedMonth(m => prevMonth(m))}
          className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-base font-semibold text-gray-800 min-w-[90px] text-center">
          {formatMonth(selectedMonth)}
        </span>
        <button
          onClick={() => setSelectedMonth(m => nextMonth(m))}
          disabled={!canGoNext}
          className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        {selectedMonth !== thisMonth && (
          <button
            onClick={() => setSelectedMonth(thisMonth)}
            className="ml-1 text-xs text-blue-600 hover:underline"
          >
            Back to this month
          </button>
        )}
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Paid (Full)"
          value={fullList.length}
          sub={`out of ${eligible.length}`}
          icon={CheckCircle2}
          iconClass="bg-green-50 text-green-600"
          valueClass="text-green-700"
        />
        <StatCard
          label="Partial"
          value={partialList.length}
          sub="short payment"
          icon={AlertCircle}
          iconClass="bg-orange-50 text-orange-500"
          valueClass="text-orange-600"
        />
        <StatCard
          label="Unpaid"
          value={unpaidList.length}
          sub="no payment yet"
          icon={XCircle}
          iconClass="bg-red-50 text-red-500"
          valueClass="text-red-600"
        />
        <StatCard
          label="Total Collected"
          value={`RM ${totalCollected.toLocaleString('en-MY', { minimumFractionDigits: 2 })}`}
          sub={`${collectionRate}% collection rate`}
          icon={CheckCircle2}
          iconClass="bg-blue-50 text-blue-600"
        />
      </div>

      {/* ── Chart ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Monthly Collection Status (last 12 months)</h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={chartData} barCategoryGap="35%" barGap={3}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={24} />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
              cursor={{ fill: '#f9fafb' }}
            />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
            <Bar dataKey="full"    name="Full"    fill="#22c55e" radius={[3, 3, 0, 0]} />
            <Bar dataKey="partial" name="Partial" fill="#f97316" radius={[3, 3, 0, 0]} />
            <Bar dataKey="unpaid"  name="Unpaid"  fill="#ef4444" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Resident Tables ── */}
      <div className="grid md:grid-cols-2 gap-4">

        {/* Unpaid */}
        <ResidentTable
          title="Unpaid"
          titleClass="text-red-600"
          emptyMsg="Everyone has paid 🎉"
          rows={unpaidList.map(x => ({
            name: x.r.full_name,
            detail: x.r.fee != null
              ? `Fee: RM ${x.r.fee.toLocaleString('en-MY', { minimumFractionDigits: 2 })}`
              : 'Fee not set',
            badge: 'Unpaid',
            badgeClass: 'bg-red-100 text-red-700',
          }))}
        />

        {/* Partial */}
        <ResidentTable
          title="Partial Payment"
          titleClass="text-orange-600"
          emptyMsg="No partial payments"
          rows={partialList.map(x => ({
            name: x.r.full_name,
            detail: x.payment
              ? `Paid: RM ${x.payment.amount.toLocaleString('en-MY', { minimumFractionDigits: 2 })}`
              : '',
            badge: 'Partial',
            badgeClass: 'bg-orange-100 text-orange-700',
          }))}
        />
      </div>

      {/* Paid full */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-green-700">Paid in Full ({fullList.length})</h3>
        </div>
        {fullList.length === 0 ? (
          <p className="px-5 py-4 text-sm text-gray-400">No full payments yet this month</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500">Resident</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500">Amount</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500">Date Paid</th>
              </tr>
            </thead>
            <tbody>
              {fullList.map(({ r, payment }) => (
                <tr key={r.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 font-medium text-gray-800">{r.full_name}</td>
                  <td className="px-5 py-3 text-right text-gray-700">
                    RM {payment?.amount.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-5 py-3 text-right text-gray-500">
                    {payment?.payment_date
                      ? new Date(payment.payment_date).toLocaleDateString('en-GB')
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

    </div>
  )
}

function ResidentTable({
  title,
  titleClass,
  emptyMsg,
  rows,
}: {
  title: string
  titleClass: string
  emptyMsg: string
  rows: { name: string; detail: string; badge: string; badgeClass: string }[]
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className={cn('text-sm font-semibold', titleClass)}>{title} ({rows.length})</h3>
      </div>
      {rows.length === 0 ? (
        <p className="px-5 py-4 text-sm text-gray-400">{emptyMsg}</p>
      ) : (
        <ul className="divide-y divide-gray-50">
          {rows.map((row, i) => (
            <li key={i} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
              <div>
                <p className="text-sm font-medium text-gray-800">{row.name}</p>
                {row.detail && <p className="text-xs text-gray-400 mt-0.5">{row.detail}</p>}
              </div>
              <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', row.badgeClass)}>
                {row.badge}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
