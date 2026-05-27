'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { Users, HeartHandshake, AlertTriangle, ShieldAlert } from 'lucide-react'
import { cn } from '@/lib/utils'

type Worker = {
  id: string
  name: string
  nickname: string | null
  worker_type: 'local' | 'foreign'
  status: 'active' | 'inactive'
  passport_expiry: string | null
  passport_permit_date: string | null
  typhoid_vaccine_expiry: string | null
  date_start_work: string | null
}

type Resident = {
  id: string
  full_name: string
  caregiver_id: string | null
  condition: 'mobile' | 'wheelchair_bound' | 'bedridden' | null
  status: 'active' | 'discharged'
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

// Days until a date (negative = already expired)
function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null
  const diff = new Date(dateStr).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function expiryClass(days: number | null): string {
  if (days === null) return 'text-gray-300'
  if (days < 0)   return 'text-red-600 font-semibold'
  if (days <= 60) return 'text-orange-500 font-semibold'
  return 'text-green-600'
}

function expiryLabel(dateStr: string | null): string {
  if (!dateStr) return '—'
  const days = daysUntil(dateStr)!
  const formatted = new Date(dateStr).toLocaleDateString('en-GB')
  if (days < 0)   return `${formatted} (expired)`
  if (days === 0) return `${formatted} (today!)`
  if (days <= 60) return `${formatted} (${days}d)`
  return formatted
}

function ExpiryBadge({ days }: { days: number | null }) {
  if (days === null) return <span className="text-xs text-gray-300">—</span>
  if (days < 0)
    return <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-red-100 text-red-700">Expired</span>
  if (days <= 30)
    return <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-red-100 text-red-700">{days}d</span>
  if (days <= 60)
    return <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-orange-100 text-orange-700">{days}d</span>
  return <span className="text-xs text-green-600">OK</span>
}

function StatCard({
  label, value, sub, icon: Icon, iconClass,
}: {
  label: string; value: number | string; sub?: string
  icon: React.ElementType; iconClass: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-4">
      <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0', iconClass)}>
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

export function CaregiverReportClient({
  workers,
  residents,
}: {
  workers: Worker[]
  residents: Resident[]
}) {
  const CONDITION_ORDER: Record<string, number> = { mobile: 0, wheelchair_bound: 1, bedridden: 2 }

  // ── Caregiver load — foreign workers only ───────────────────────────────
  const caregiverLoad = useMemo(() => {
    return workers
      .filter(w => w.worker_type === 'foreign')
      .map(w => {
        const assigned = residents
          .filter(r => r.caregiver_id === w.id)
          .sort((a, b) => {
            const ca = CONDITION_ORDER[a.condition ?? ''] ?? 3
            const cb = CONDITION_ORDER[b.condition ?? ''] ?? 3
            if (ca !== cb) return ca - cb
            return a.full_name.localeCompare(b.full_name)
          })
        const mobile     = assigned.filter(r => r.condition === 'mobile').length
        const wheelchair = assigned.filter(r => r.condition === 'wheelchair_bound').length
        const bedridden  = assigned.filter(r => r.condition === 'bedridden').length
        const unknown    = assigned.filter(r => !r.condition).length
        return { w, assigned, mobile, wheelchair, bedridden, unknown }
      })
      .sort((a, b) => b.assigned.length - a.assigned.length)
  }, [workers, residents])

  const unassigned = residents.filter(r => !r.caregiver_id)

  // ── Document expiry alerts ──────────────────────────────────────────────
  const expiryAlerts = useMemo(() => {
    const alerts: {
      worker: Worker
      doc: 'Passport' | 'Work Permit' | 'Typhoid'
      date: string
      days: number
    }[] = []

    for (const w of workers.filter(w => w.worker_type === 'foreign' && !!w.passport_permit_date)) {
      const checks: [string, 'Passport' | 'Work Permit' | 'Typhoid'][] = [
        [w.passport_expiry ?? '', 'Passport'],
        [w.passport_permit_date ?? '', 'Work Permit'],
        [w.typhoid_vaccine_expiry ?? '', 'Typhoid'],
      ]
      for (const [date, doc] of checks) {
        if (!date) continue
        const days = daysUntil(date)!
        if (days <= 90) {
          alerts.push({ worker: w, doc, date, days })
        }
      }
    }

    return alerts.sort((a, b) => a.days - b.days)
  }, [workers])

  const expiredCount  = expiryAlerts.filter(a => a.days < 0).length
  const urgentCount   = expiryAlerts.filter(a => a.days >= 0 && a.days <= 30).length
  const warningCount  = expiryAlerts.filter(a => a.days > 30 && a.days <= 90).length

  const caregivers   = workers.filter(w => w.worker_type === 'foreign')
  const localWorkers = workers.filter(w => w.worker_type === 'local')

  return (
    <div className="space-y-6 max-w-5xl">

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Active Caregivers"
          value={caregivers.length}
          sub="foreign workers"
          icon={HeartHandshake}
          iconClass="bg-blue-50 text-blue-600"
        />
        <StatCard
          label="Local Workers"
          value={localWorkers.length}
          sub="active"
          icon={Users}
          iconClass="bg-purple-50 text-purple-600"
        />
        <StatCard
          label="Expired Documents"
          value={expiredCount}
          sub={expiredCount > 0 ? 'needs immediate action' : 'all clear'}
          icon={ShieldAlert}
          iconClass={expiredCount > 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-500'}
        />
        <StatCard
          label="Expiring ≤ 90 days"
          value={urgentCount + warningCount}
          sub={urgentCount > 0 ? `${urgentCount} within 30 days` : 'none urgent'}
          icon={AlertTriangle}
          iconClass={(urgentCount + warningCount) > 0 ? 'bg-orange-50 text-orange-500' : 'bg-green-50 text-green-500'}
        />
      </div>

      {/* ── Document Expiry Alerts ── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-700">Document Expiry Reminders</h3>
            <p className="text-xs text-gray-400 mt-0.5">Passport · Work Permit · Typhoid — expiring within 90 days or already expired</p>
          </div>
        </div>

        {expiryAlerts.length === 0 ? (
          <div className="px-5 py-6 text-center">
            <p className="text-sm text-green-600 font-medium">All documents are valid ✓</p>
            <p className="text-xs text-gray-400 mt-1">No documents expiring within 90 days</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500">Caregiver</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500">Document</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500">Expiry Date</th>
                <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody>
              {expiryAlerts.map((alert, i) => (
                <tr
                  key={i}
                  className={cn(
                    'border-b border-gray-50 last:border-0 transition-colors',
                    alert.days < 0   ? 'bg-red-50/40'    :
                    alert.days <= 30 ? 'bg-orange-50/30' : 'hover:bg-gray-50',
                  )}
                >
                  <td className="px-5 py-3">
                    <Link href={`/admin/workers/${alert.worker.id}`} className="font-medium text-blue-600 hover:underline">
                      {alert.worker.name}
                    </Link>
                    {alert.worker.nickname && (
                      <span className="ml-1.5 text-xs text-gray-400">({alert.worker.nickname})</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-gray-600">{alert.doc}</td>
                  <td className={cn('px-5 py-3', expiryClass(alert.days))}>
                    {expiryLabel(alert.date)}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <ExpiryBadge days={alert.days} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Caregiver Load Table ── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">Resident Assignment per Caregiver</h3>
          <p className="text-xs text-gray-400 mt-0.5">Active residents only · sorted Mobile → Wheelchair → Bedridden → A–Z</p>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500">Caregiver</th>
              <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500">Total</th>
              <th className="text-center px-5 py-3 text-xs font-semibold text-green-600">Mobile</th>
              <th className="text-center px-5 py-3 text-xs font-semibold text-yellow-600">Wheelchair</th>
              <th className="text-center px-5 py-3 text-xs font-semibold text-red-500">Bedridden</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500">Residents</th>
            </tr>
          </thead>
          <tbody>
            {caregiverLoad.map(({ w, assigned, mobile, wheelchair, bedridden, unknown }) => (
              <tr key={w.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                <td className="px-5 py-3">
                  <Link href={`/admin/workers/${w.id}`} className="font-medium text-blue-600 hover:underline">
                    {w.name}
                  </Link>
                  {w.nickname && <p className="text-xs text-gray-400">{w.nickname}</p>}
                </td>
                <td className="px-5 py-3 text-center">
                  <span className={cn(
                    'inline-block w-7 h-7 rounded-full text-sm font-bold flex items-center justify-center',
                    assigned.length === 0
                      ? 'bg-gray-100 text-gray-400'
                      : assigned.length >= 4
                      ? 'bg-red-100 text-red-700'
                      : 'bg-blue-100 text-blue-700',
                  )}>
                    {assigned.length}
                  </span>
                </td>
                <td className="px-5 py-3 text-center text-gray-600">{mobile || '—'}</td>
                <td className="px-5 py-3 text-center text-gray-600">{wheelchair || '—'}</td>
                <td className="px-5 py-3 text-center text-gray-600">{bedridden || '—'}</td>
                <td className="px-5 py-3">
                  {assigned.length === 0 ? (
                    <span className="text-xs text-gray-300">No residents assigned</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {assigned.map(r => (
                        <Link
                          key={r.id}
                          href={`/residents/${r.id}`}
                          className={cn(
                            'text-xs px-1.5 py-0.5 rounded font-medium hover:opacity-75 transition-opacity',
                            r.condition ? CONDITION_COLOR[r.condition] : 'bg-gray-100 text-gray-500',
                          )}
                          title={r.condition ? CONDITION_LABEL[r.condition] : 'Unknown condition'}
                        >
                          {r.full_name}
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

      {/* ── Unassigned Residents ── */}
      {unassigned.length > 0 && (
        <div className="bg-white rounded-xl border border-orange-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-orange-100 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            <h3 className="text-sm font-semibold text-orange-700">
              {unassigned.length} Resident{unassigned.length > 1 ? 's' : ''} Without a Caregiver
            </h3>
          </div>
          <div className="px-5 py-3 flex flex-wrap gap-2">
            {unassigned.map(r => (
              <span
                key={r.id}
                className={cn(
                  'text-xs px-2 py-1 rounded-lg font-medium',
                  r.condition ? CONDITION_COLOR[r.condition] : 'bg-gray-100 text-gray-600',
                )}
              >
                {r.full_name}
                {r.condition && ` · ${CONDITION_LABEL[r.condition]}`}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Full Document Expiry Table ── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">All Document Expiry Dates</h3>
          <p className="text-xs text-gray-400 mt-0.5">Caregivers with work permit — full overview</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500">Worker</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500">Passport Expiry</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500">Work Permit</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500">Typhoid Expiry</th>
              </tr>
            </thead>
            <tbody>
              {workers.filter(w => w.worker_type === 'foreign' && !!w.passport_permit_date).map(w => {
                const passportDays = daysUntil(w.passport_expiry)
                const permitDays   = daysUntil(w.passport_permit_date)
                const typhoidDays  = daysUntil(w.typhoid_vaccine_expiry)
                return (
                  <tr key={w.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <Link href={`/admin/workers/${w.id}`} className="font-medium text-blue-600 hover:underline">
                        {w.name}
                      </Link>
                      {w.nickname && <p className="text-xs text-gray-400">{w.nickname}</p>}
                    </td>
                    <td className={cn('px-5 py-3 whitespace-nowrap', expiryClass(passportDays))}>
                      {expiryLabel(w.passport_expiry)}
                    </td>
                    <td className={cn('px-5 py-3 whitespace-nowrap', expiryClass(permitDays))}>
                      {expiryLabel(w.passport_permit_date)}
                    </td>
                    <td className={cn('px-5 py-3 whitespace-nowrap', expiryClass(typhoidDays))}>
                      {expiryLabel(w.typhoid_vaccine_expiry)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
