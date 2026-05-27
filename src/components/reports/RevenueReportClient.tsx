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
import { TrendingUp, Wallet, AlertCircle, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

type Resident = {
  id: string
  fee: number | null
  admission_date: string
  date_of_discharge: string | null
  status: 'active' | 'discharged'
}

type Payment = {
  resident_id: string | null
  for_month: string | null
  amount: number
  full_payment: boolean | null
}

type ExtraCharge = {
  id: string
  resident_id: string
  billing_month: string
  amount: number
  quantity: number
  description: string
  charge_item_id: string | null
}

type ChargeItem = {
  id: string
  name: string
  unit: string | null
  category: string | null
}

const CATEGORY_ORDER = ['Transportation', 'Clinic Bills', 'Medicines', 'Groceries', 'Services', 'Others']

const CATEGORY_COLOR: Record<string, string> = {
  'Transportation': 'bg-blue-100 text-blue-700',
  'Clinic Bills':   'bg-red-100 text-red-700',
  'Medicines':      'bg-purple-100 text-purple-700',
  'Groceries':      'bg-green-100 text-green-700',
  'Services':       'bg-orange-100 text-orange-700',
  'Others':         'bg-gray-100 text-gray-600',
}

// ── Helpers ──────────────────────────────────────────────────────────────────

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

function formatMonth(ym: string) {
  const [y, m] = ym.split('-')
  return new Date(Number(y), Number(m) - 1, 1).toLocaleString('en-MY', { month: 'short', year: '2-digit' })
}

function rmFormat(n: number) {
  return `RM ${n.toLocaleString('en-MY', { minimumFractionDigits: 2 })}`
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

// A resident is billable in a given month if they were admitted on/before
// the last day of that month AND not discharged before the first day.
function isBillable(r: Resident, ym: string): boolean {
  const monthStart = ym + '-01'
  const monthEnd   = ym + '-31'   // safe upper bound for comparison
  if (r.admission_date > monthEnd) return false
  if (r.date_of_discharge && r.date_of_discharge < monthStart) return false
  return true
}

function computeMonthRevenue(
  ym: string,
  residents: Resident[],
  extrasByMonth: Map<string, number>,         // billing_month → total extras
  extrasByResidentMonth: Map<string, number>,  // residentId::billing_month → total
  collectedByMonth: Map<string, number>,       // for_month → total payments
) {
  const billable = residents.filter(r => isBillable(r, ym))
  const feeTotal   = billable.reduce((s, r) => s + (r.fee ?? 0), 0)
  const extrasTotal = extrasByMonth.get(ym) ?? 0
  const expected   = feeTotal + extrasTotal
  const collected  = collectedByMonth.get(ym) ?? 0
  const outstanding = Math.max(0, expected - collected)
  return { feeTotal, extrasTotal, expected, collected, outstanding, billableCount: billable.length }
}

// ── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  iconClass,
  valueClass,
}: {
  label: string
  value: string
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
      <div className="min-w-0">
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className={cn('text-xl font-bold mt-0.5 truncate', valueClass ?? 'text-gray-900')}>{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ── Main Component ───────────────────────────────────────────────────────────

export function RevenueReportClient({
  residents,
  payments,
  extraCharges,
  chargeItems,
}: {
  residents: Resident[]
  payments: Payment[]
  extraCharges: ExtraCharge[]
  chargeItems: ChargeItem[]
}) {
  const thisMonth = currentYM()
  const [selectedMonth, setSelectedMonth] = useState(thisMonth)
  const months    = useMemo(() => lastNMonths(12), [])

  // Pre-build lookup maps
  const collectedByMonth = useMemo(() => {
    const map = new Map<string, number>()
    for (const p of payments) {
      if (!p.for_month) continue
      map.set(p.for_month, (map.get(p.for_month) ?? 0) + p.amount)
    }
    return map
  }, [payments])

  const extrasByMonth = useMemo(() => {
    const map = new Map<string, number>()
    for (const e of extraCharges) {
      map.set(e.billing_month, (map.get(e.billing_month) ?? 0) + e.amount)
    }
    return map
  }, [extraCharges])

  const extrasByResidentMonth = useMemo(() => {
    const map = new Map<string, number>()
    for (const e of extraCharges) {
      const key = `${e.resident_id}::${e.billing_month}`
      map.set(key, (map.get(key) ?? 0) + e.amount)
    }
    return map
  }, [extraCharges])

  // Selected month stats
  const current = useMemo(
    () => computeMonthRevenue(selectedMonth, residents, extrasByMonth, extrasByResidentMonth, collectedByMonth),
    [selectedMonth, residents, extrasByMonth, extrasByResidentMonth, collectedByMonth],
  )

  // YTD: sum all payments in current year
  const currentYear = thisMonth.slice(0, 4)
  const ytdCollected = useMemo(
    () => payments
      .filter(p => p.for_month?.startsWith(currentYear))
      .reduce((s, p) => s + p.amount, 0),
    [payments, currentYear],
  )

  // Payment-by-resident-month map (for collection status chart)
  const paymentByResidentMonth = useMemo(() => {
    const map = new Map<string, Payment>()
    for (const p of payments) {
      if (!p.for_month || !p.resident_id) continue
      const key = `${p.resident_id}::${p.for_month}`
      if (!map.has(key)) map.set(key, p)
    }
    return map
  }, [payments])

  // Chart data — last 12 months (Expected vs Collected RM)
  const chartData = useMemo(() => {
    return months.map(ym => {
      const { expected, collected } = computeMonthRevenue(
        ym, residents, extrasByMonth, extrasByResidentMonth, collectedByMonth,
      )
      return { month: formatMonth(ym), expected, collected }
    })
  }, [months, residents, extrasByMonth, extrasByResidentMonth, collectedByMonth])

  // Collection status chart — Full / Partial / Unpaid resident counts per month
  const statusChartData = useMemo(() => {
    return months.map(ym => {
      const billable = residents.filter(r => isBillable(r, ym))
      let full = 0, partial = 0, unpaid = 0
      for (const r of billable) {
        const payment = paymentByResidentMonth.get(`${r.id}::${ym}`)
        if (!payment) { unpaid++; continue }
        if (payment.full_payment === true) { full++; continue }
        const fee = r.fee ?? null
        if (fee === null) { partial++; continue }
        const extras = extrasByResidentMonth.get(`${r.id}::${ym}`) ?? 0
        payment.amount >= fee + extras ? full++ : partial++
      }
      return { month: formatMonth(ym), full, partial, unpaid }
    })
  }, [months, residents, paymentByResidentMonth, extrasByResidentMonth])

  // Monthly summary table — last 12 months newest first
  const tableRows = useMemo(() => {
    return [...months].reverse().map(ym => {
      const data = computeMonthRevenue(ym, residents, extrasByMonth, extrasByResidentMonth, collectedByMonth)
      const rate = data.expected === 0 ? 0 : Math.round((data.collected / data.expected) * 100)
      return { ym, label: formatMonth(ym), ...data, rate }
    })
  }, [months, residents, extrasByMonth, extrasByResidentMonth, collectedByMonth])

  const collectionRate = current.expected === 0 ? 0 : Math.round((current.collected / current.expected) * 100)
  const canGoNext = selectedMonth < thisMonth

  // ── Extra charges breakdown ───────────────────────────────────────────────
  // Group all-time extra charges by item (or description if no item)
  const chargeItemMap = useMemo(() => {
    const map = new Map<string, ChargeItem>()
    for (const ci of chargeItems) map.set(ci.id, ci)
    return map
  }, [chargeItems])

  // Monthly extra charges by category (last 12 months) — for stacked bar chart
  const extraMonthlyCategoryData = useMemo(() => {
    return months.map(ym => {
      const row: Record<string, number | string> = { month: formatMonth(ym) }
      for (const cat of CATEGORY_ORDER) row[cat] = 0
      for (const e of extraCharges.filter(ec => ec.billing_month === ym)) {
        const ci  = e.charge_item_id ? chargeItemMap.get(e.charge_item_id) : null
        const cat = ci?.category || 'Others'
        row[cat] = ((row[cat] as number) ?? 0) + (e.amount ?? 0)
      }
      return row
    })
  }, [months, extraCharges, chargeItemMap])

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
          label="Expected"
          value={rmFormat(current.expected)}
          sub={`${current.billableCount} residents`}
          icon={TrendingUp}
          iconClass="bg-indigo-50 text-indigo-600"
          valueClass="text-indigo-700"
        />
        <StatCard
          label="Collected"
          value={rmFormat(current.collected)}
          sub={`${collectionRate}% of expected`}
          icon={Wallet}
          iconClass="bg-blue-50 text-blue-600"
          valueClass="text-blue-700"
        />
        <StatCard
          label="Outstanding"
          value={rmFormat(current.outstanding)}
          sub={current.outstanding === 0 ? 'All cleared 🎉' : 'Still owed'}
          icon={AlertCircle}
          iconClass={current.outstanding === 0 ? 'bg-green-50 text-green-500' : 'bg-red-50 text-red-500'}
          valueClass={current.outstanding === 0 ? 'text-green-700' : 'text-red-600'}
        />
        <StatCard
          label="YTD Collected"
          value={rmFormat(ytdCollected)}
          sub={`Jan – ${formatMonth(thisMonth)}`}
          icon={CalendarDays}
          iconClass="bg-purple-50 text-purple-600"
          valueClass="text-purple-700"
        />
      </div>

      {/* ── Expected vs Collected Chart ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Expected vs Collected (last 12 months)</h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={chartData} barCategoryGap="35%" barGap={4}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <YAxis
              tickFormatter={v => `RM ${(v / 1000).toFixed(0)}k`}
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
              width={52}
            />
            <Tooltip
              formatter={(val) => typeof val === 'number' ? rmFormat(val) : String(val)}
              contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
              cursor={{ fill: '#f9fafb' }}
            />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
            <Bar dataKey="expected"  name="Expected"  fill="#818cf8" radius={[3, 3, 0, 0]} />
            <Bar dataKey="collected" name="Collected" fill="#22c55e" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Monthly Collection Status Chart ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Monthly Collection Status (last 12 months)</h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={statusChartData} barCategoryGap="35%" barGap={3}>
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

      {/* ── Extra Charges by Category (Monthly) ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Extra Charges by Category (last 12 months)</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={extraMonthlyCategoryData} barCategoryGap="35%">
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <YAxis
              tickFormatter={v => `RM ${(v / 1000).toFixed(0)}k`}
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
              width={52}
            />
            <Tooltip
              formatter={(val) => typeof val === 'number' ? rmFormat(val) : String(val)}
              contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
              cursor={{ fill: '#f9fafb' }}
            />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
            <Bar dataKey="Transportation" stackId="a" fill="#3b82f6" />
            <Bar dataKey="Clinic Bills"   stackId="a" fill="#ef4444" />
            <Bar dataKey="Medicines"      stackId="a" fill="#a855f7" />
            <Bar dataKey="Groceries"      stackId="a" fill="#22c55e" />
            <Bar dataKey="Services"       stackId="a" fill="#f97316" />
            <Bar dataKey="Others"         stackId="a" fill="#9ca3af" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Revenue Breakdown this month ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">
          Revenue Breakdown — {formatMonth(selectedMonth)}
        </h3>
        <div className="flex flex-wrap gap-4">
          <BreakdownTile
            label="Base Fees"
            amount={current.feeTotal}
            pct={current.expected === 0 ? 0 : Math.round((current.feeTotal / current.expected) * 100)}
            color="bg-blue-50 text-blue-700 border-blue-100"
          />
          <BreakdownTile
            label="Extra Charges"
            amount={current.extrasTotal}
            pct={current.expected === 0 ? 0 : Math.round((current.extrasTotal / current.expected) * 100)}
            color="bg-orange-50 text-orange-700 border-orange-100"
          />
          <BreakdownTile
            label="Total Expected"
            amount={current.expected}
            pct={100}
            color="bg-gray-50 text-gray-700 border-gray-200"
          />
        </div>
      </div>

      {/* ── Monthly Summary Table ── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">Monthly Summary (last 12 months)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500">Month</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500">Expected</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500">Collected</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500">Outstanding</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500">Rate</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map(row => (
                <tr
                  key={row.ym}
                  className={cn(
                    'border-b border-gray-50 last:border-0 transition-colors',
                    row.ym === thisMonth ? 'bg-blue-50/40' : 'hover:bg-gray-50',
                  )}
                >
                  <td className="px-5 py-3 font-medium text-gray-700 whitespace-nowrap">
                    {row.label}
                    {row.ym === thisMonth && (
                      <span className="ml-2 text-[10px] font-semibold bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">
                        current
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right text-gray-600 whitespace-nowrap">{rmFormat(row.expected)}</td>
                  <td className="px-5 py-3 text-right text-gray-800 font-medium whitespace-nowrap">{rmFormat(row.collected)}</td>
                  <td className={cn(
                    'px-5 py-3 text-right font-medium whitespace-nowrap',
                    row.outstanding > 0 ? 'text-red-600' : 'text-green-600',
                  )}>
                    {row.outstanding > 0 ? rmFormat(row.outstanding) : '—'}
                  </td>
                  <td className="px-5 py-3 text-right whitespace-nowrap">
                    <span className={cn(
                      'inline-block text-xs font-semibold px-2 py-0.5 rounded-full',
                      row.rate >= 100 ? 'bg-green-100 text-green-700' :
                      row.rate >= 70  ? 'bg-yellow-100 text-yellow-700' :
                                        'bg-red-100 text-red-600',
                    )}>
                      {row.rate}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>


    </div>
  )
}

function BreakdownTile({
  label,
  amount,
  pct,
  color,
}: {
  label: string
  amount: number
  pct: number
  color: string
}) {
  return (
    <div className={cn('rounded-xl border px-5 py-4 min-w-[160px]', color)}>
      <p className="text-xs font-medium opacity-70">{label}</p>
      <p className="text-xl font-bold mt-1">{rmFormat(amount)}</p>
      <p className="text-xs font-semibold mt-0.5 opacity-60">{pct}% of total</p>
    </div>
  )
}
