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
import Link from 'next/link'
import { Users, UserCheck, UserMinus, Activity } from 'lucide-react'
import { cn } from '@/lib/utils'

type Resident = {
  id: string
  full_name: string
  gender: 'male' | 'female' | null
  condition: 'mobile' | 'wheelchair_bound' | 'bedridden' | null
  physio: 'yes' | 'no' | 'foc' | 'alternate_day' | null
  admission_date: string
  date_of_discharge: string | null
  status: 'active' | 'discharged'
  created_at: string
}

const CONDITION_LABEL: Record<string, string> = {
  mobile: 'Mobile',
  wheelchair_bound: 'Wheelchair',
  bedridden: 'Bedridden',
}

const CONDITION_COLOR: Record<string, string> = {
  mobile: 'bg-green-100 text-green-700',
  wheelchair_bound: 'bg-yellow-100 text-yellow-700',
  bedridden: 'bg-red-100 text-red-700',
}

const PHYSIO_LABEL: Record<string, string> = {
  yes: 'Yes',
  no: 'No',
  foc: 'FOC',
  alternate_day: 'Alt. Day',
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
}: {
  label: string
  value: number | string
  sub?: string
  icon: React.ElementType
  color: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-4">
      <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0', color)}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// Build last N months labels (YYYY-MM)
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

export function ResidentReportClient({ residents }: { residents: Resident[] }) {
  const [months] = useState(() => lastNMonths(12))

  // ── Overview stats ──────────────────────────────────────────────────────
  const active = residents.filter(r => r.status === 'active')
  const discharged = residents.filter(r => r.status === 'discharged')

  const maleCount = active.filter(r => r.gender === 'male').length
  const femaleCount = active.filter(r => r.gender === 'female').length

  const conditionCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const r of active) {
      const k = r.condition ?? 'unknown'
      counts[k] = (counts[k] ?? 0) + 1
    }
    return counts
  }, [active])

  const physioActive = active.filter(r => r.physio === 'yes' || r.physio === 'foc' || r.physio === 'alternate_day').length

  // ── Monthly chart data ───────────────────────────────────────────────────
  const chartData = useMemo(() => {
    return months.map(ym => {
      const admitted = residents.filter(r => r.admission_date?.slice(0, 7) === ym).length
      const dischDischarge = residents.filter(r => r.date_of_discharge?.slice(0, 7) === ym).length
      return { month: formatMonth(ym), admitted, discharged: dischDischarge }
    })
  }, [months, residents])

  // ── Monthly detail table ─────────────────────────────────────────────────
  const monthlyDetail = useMemo(() => {
    return months.map(ym => {
      const admitted = residents
        .filter(r => r.admission_date?.slice(0, 7) === ym)
        .map(r => ({ id: r.id, name: r.full_name }))
      const dischargedList = residents
        .filter(r => r.date_of_discharge?.slice(0, 7) === ym)
        .map(r => ({ id: r.id, name: r.full_name }))
      return { ym, label: formatMonth(ym), admitted, discharged: dischargedList }
    }).filter(m => m.admitted.length > 0 || m.discharged.length > 0)
    .reverse()
  }, [months, residents])

  return (
    <div className="space-y-6 max-w-5xl">

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Active Residents" value={active.length} icon={Users} color="bg-blue-50 text-blue-600" />
        <StatCard label="Discharged" value={discharged.length} icon={UserMinus} color="bg-gray-100 text-gray-500" />
        <StatCard
          label="Gender (active)"
          value={`${maleCount}M / ${femaleCount}F`}
          sub={`${active.length} total`}
          icon={UserCheck}
          color="bg-purple-50 text-purple-600"
        />
        <StatCard
          label="Physio (active)"
          value={physioActive}
          sub={`out of ${active.length}`}
          icon={Activity}
          color="bg-emerald-50 text-emerald-600"
        />
      </div>

      {/* ── Condition Breakdown ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Condition Breakdown (Active)</h3>
        <div className="flex flex-wrap gap-3">
          {(['mobile', 'wheelchair_bound', 'bedridden'] as const).map(c => (
            <div key={c} className={cn('rounded-lg px-4 py-3 flex flex-col items-center min-w-[90px]', CONDITION_COLOR[c])}>
              <span className="text-2xl font-bold">{conditionCounts[c] ?? 0}</span>
              <span className="text-xs font-medium mt-0.5">{CONDITION_LABEL[c]}</span>
            </div>
          ))}
          {conditionCounts['unknown'] ? (
            <div className="rounded-lg px-4 py-3 flex flex-col items-center min-w-[90px] bg-gray-100 text-gray-500">
              <span className="text-2xl font-bold">{conditionCounts['unknown']}</span>
              <span className="text-xs font-medium mt-0.5">Unknown</span>
            </div>
          ) : null}
        </div>

        {/* Physio breakdown */}
        <div className="mt-5 border-t border-gray-100 pt-4">
          <p className="text-xs font-semibold text-gray-500 mb-3">Physio Status (Active)</p>
          <div className="flex flex-wrap gap-2">
            {(['yes', 'foc', 'alternate_day', 'no'] as const).map(p => {
              const count = active.filter(r => r.physio === p).length
              return (
                <div key={p} className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
                  <span className="text-sm font-semibold text-gray-800">{count}</span>
                  <span className="text-xs text-gray-500">{PHYSIO_LABEL[p]}</span>
                </div>
              )
            })}
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
              <span className="text-sm font-semibold text-gray-800">{active.filter(r => !r.physio).length}</span>
              <span className="text-xs text-gray-500">Not set</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Monthly Admissions vs Discharges Chart ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Monthly Admissions vs Discharges (last 12 months)</h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={chartData} barCategoryGap="35%" barGap={4}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={24} />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
              cursor={{ fill: '#f9fafb' }}
            />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
            <Bar dataKey="admitted" name="Admitted" fill="#3b82f6" radius={[3, 3, 0, 0]} />
            <Bar dataKey="discharged" name="Discharged" fill="#ef4444" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Monthly Detail Table ── */}
      {monthlyDetail.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700">Admission & Discharge Events</h3>
            <p className="text-xs text-gray-400 mt-0.5">Months with activity, newest first</p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 w-24">Month</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-blue-500">Admitted</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500">Discharged</th>
              </tr>
            </thead>
            <tbody>
              {monthlyDetail.map(({ ym, label, admitted, discharged: dis }) => (
                <tr key={ym} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 font-medium text-gray-700 whitespace-nowrap">{label}</td>
                  <td className="px-5 py-3">
                    {admitted.length === 0 ? (
                      <span className="text-gray-300">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {admitted.map(r => (
                          <Link key={r.id} href={`/residents/${r.id}`} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium hover:opacity-75 transition-opacity">
                            {r.name}
                          </Link>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    {dis.length === 0 ? (
                      <span className="text-gray-300">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {dis.map(r => (
                          <Link key={r.id} href={`/residents/${r.id}`} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-medium hover:opacity-75 transition-opacity">
                            {r.name}
                          </Link>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
