'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, ArrowUpDown, ArrowUp, ArrowDown, LayoutList, LayoutGrid, Pencil, CalendarOff } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { formatDate } from '@/lib/utils'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyWorker = any

type WorkerType = 'local' | 'foreign'
type SortDir = 'asc' | 'desc'
type ViewMode = 'simple' | 'detail'

// Sort keys valid for all workers
type CommonSortKey = 'name' | 'gender' | 'start' | 'service' | 'salary'
// Sort keys only for foreign
type ForeignSortKey = 'passport_expiry' | 'permit_date' | 'typhoid'
// Sort keys only for local
type LocalSortKey = 'position'

type SortKey = CommonSortKey | ForeignSortKey | LocalSortKey

// ── Helpers ───────────────────────────────────────────────────
function serviceMs(startDate: string | null): number {
  if (!startDate) return -1
  return Date.now() - new Date(startDate).getTime()
}

function serviceLabel(startDate: string | null): string {
  if (!startDate) return '—'
  const ms = serviceMs(startDate)
  const years = Math.floor(ms / (365.25 * 24 * 3600 * 1000))
  const months = Math.floor((ms % (365.25 * 24 * 3600 * 1000)) / (30.44 * 24 * 3600 * 1000))
  if (years === 0) return `${months} mo`
  if (months === 0) return `${years} yr${years !== 1 ? 's' : ''}`
  return `${years} yr${years !== 1 ? 's' : ''} ${months} mo`
}

function expiryBadge(dateStr: string | null): React.ReactNode {
  if (!dateStr) return <span className="text-gray-400">—</span>
  const daysLeft = Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 3600 * 24))
  const label = formatDate(dateStr)
  if (daysLeft < 0) {
    return <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">{label} ⚠ expired</span>
  }
  if (daysLeft <= 90) {
    return <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">{label} ⚠ {daysLeft}d</span>
  }
  return <span className="text-gray-600 text-xs">{label}</span>
}

// ── Sort helpers ──────────────────────────────────────────────
function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ArrowUpDown className="w-3.5 h-3.5 text-gray-300 ml-1 inline" />
  return sortDir === 'asc'
    ? <ArrowUp className="w-3.5 h-3.5 text-blue-500 ml-1 inline" />
    : <ArrowDown className="w-3.5 h-3.5 text-blue-500 ml-1 inline" />
}

function SortTh({
  label, col, sortKey, sortDir, onSort, className = '',
}: {
  label: string; col: SortKey; sortKey: SortKey; sortDir: SortDir
  onSort: (col: SortKey) => void; className?: string
}) {
  return (
    <th
      className={`text-left px-4 py-3 font-medium text-gray-600 cursor-pointer select-none whitespace-nowrap hover:text-gray-900 ${className}`}
      onClick={() => onSort(col)}
    >
      {label}<SortIcon col={col} sortKey={sortKey} sortDir={sortDir} />
    </th>
  )
}

// ── Component ─────────────────────────────────────────────────
interface WorkerTableProps {
  workers: AnyWorker[]
  workerType: WorkerType
  isAdmin: boolean
  emptyLabel?: string
  defaultHideNoPermit?: boolean
}

export function WorkerTable({ workers, workerType, isAdmin, emptyLabel = 'No workers yet.', defaultHideNoPermit = false }: WorkerTableProps) {
  const isLocal = workerType === 'local'
  const router = useRouter()

  const [search, setSearch]           = useState('')
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive'>('active')
  const [sortKey, setSortKey]         = useState<SortKey>('name')
  const [sortDir, setSortDir]         = useState<SortDir>('asc')
  const [viewMode, setViewMode]       = useState<ViewMode>('simple')
  const [hideNoPermit, setHideNoPermit] = useState(defaultHideNoPermit)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === 'a' || e.key === 'A') { e.preventDefault(); router.push(`/admin/workers/new?type=${workerType}`) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [router])

  function handleSort(col: SortKey) {
    if (col === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(col); setSortDir('asc') }
  }

  const filtered = workers
    .filter(w => {
      const q = search.toLowerCase()
      const nameMatch = w.name?.toLowerCase().includes(q)
      const nricMatch = (w.nric ?? '').toLowerCase().includes(q)
      const passportMatch = (w.passport_number ?? '').toLowerCase().includes(q)
      const countryMatch = (w.country_of_origin ?? '').toLowerCase().includes(q)
      if (!((nameMatch || nricMatch || passportMatch || countryMatch) && w.status === statusFilter)) return false
      if (!isLocal && hideNoPermit && !w.passport_permit_date) return false
      return true
    })
    .sort((a, b) => {
      let cmp = 0
      if (sortKey === 'name')           cmp = (a.name ?? '').localeCompare(b.name ?? '')
      else if (sortKey === 'gender')    cmp = (a.gender ?? '').localeCompare(b.gender ?? '')
      else if (sortKey === 'start')     cmp = (a.date_start_work ?? '').localeCompare(b.date_start_work ?? '')
      else if (sortKey === 'service')   cmp = serviceMs(a.date_start_work) - serviceMs(b.date_start_work)
      else if (sortKey === 'salary')    cmp = (a.current_salary ?? -1) - (b.current_salary ?? -1)
      else if (sortKey === 'passport_expiry') cmp = (a.passport_expiry ?? '').localeCompare(b.passport_expiry ?? '')
      else if (sortKey === 'permit_date')     cmp = (a.passport_permit_date ?? '').localeCompare(b.passport_permit_date ?? '')
      else if (sortKey === 'typhoid')         cmp = (a.typhoid_vaccine_expiry ?? '').localeCompare(b.typhoid_vaccine_expiry ?? '')
      else if (sortKey === 'position')        cmp = (a.positions?.name ?? '').localeCompare(b.positions?.name ?? '')
      return sortDir === 'asc' ? cmp : -cmp
    })

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder={isLocal ? 'Search by name or NRIC…' : 'Search by name, passport or country…'}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        {/* View toggle */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 self-start sm:self-auto">
          <button
            onClick={() => setViewMode('simple')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              viewMode === 'simple' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <LayoutList className="w-3.5 h-3.5" /> Simple
          </button>
          <button
            onClick={() => setViewMode('detail')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              viewMode === 'detail' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" /> Detail
          </button>
        </div>
      </div>

      {/* Keyboard hints */}
      <p className="text-xs text-gray-400 select-none">
        <kbd className="font-mono">A</kbd> Add new
      </p>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-sm text-gray-400">{emptyLabel}</div>
        ) : viewMode === 'simple' && isLocal ? (
          /* ── SIMPLE VIEW — LOCAL ─────────────────────── */
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <SortTh label="Name" col="name" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Gender" col="gender" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="hidden sm:table-cell" />
                  <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Position</th>
                  <SortTh label="Start Date" col="start" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="hidden lg:table-cell" />
                  <SortTh label="Service" col="service" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="hidden lg:table-cell" />
                  <SortTh label="Salary" col="salary" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="hidden xl:table-cell" />
                  {isAdmin && <th className="px-2 py-3 w-8" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((w) => (
                  <tr key={w.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-indigo-700 font-semibold text-sm">{w.name?.charAt(0)?.toUpperCase()}</span>
                        </div>
                        <div>
                          <Link href={`/admin/workers/${w.id}`} className="font-medium text-blue-700 hover:text-blue-900">{w.name}</Link>
                          {w.nickname && <p className="text-xs text-gray-500 italic">{w.nickname}</p>}
                          {w.nric && <p className="text-xs text-gray-400 font-mono">{w.nric}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 capitalize hidden sm:table-cell">{w.gender ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{w.positions?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600 hidden lg:table-cell">{formatDate(w.date_start_work)}</td>
                    <td className="px-4 py-3 text-gray-600 hidden lg:table-cell">{serviceLabel(w.date_start_work)}</td>
                    <td className="px-4 py-3 text-gray-600 hidden xl:table-cell">
                      {w.current_salary != null ? `RM ${Number(w.current_salary).toFixed(0)}` : '—'}
                    </td>
                    {isAdmin && (
                      <td className="px-2 py-3">
                        <Link href={`/admin/workers/${w.id}/edit`} className="inline-flex items-center justify-center w-7 h-7 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Edit"><Pencil className="w-3.5 h-3.5" /></Link>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : viewMode === 'simple' ? (
          /* ── SIMPLE VIEW — FOREIGN ───────────────────── */
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <SortTh label="Name" col="name" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="min-w-[180px]" />
                  <SortTh label="Gender" col="gender" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Country</th>
                  <SortTh label="Passport Exp." col="passport_expiry" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="min-w-[140px]" />
                  <SortTh label="Permit Exp." col="permit_date" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="min-w-[130px]" />
                  <SortTh label="Typhoid Exp." col="typhoid" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="min-w-[130px]" />
                  {isAdmin && <th className="px-2 py-3 w-8" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((w) => (
                  <tr key={w.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-indigo-700 font-semibold text-sm">{w.name?.charAt(0)?.toUpperCase()}</span>
                        </div>
                        <div>
                          <Link href={`/admin/workers/${w.id}`} className="font-medium text-blue-700 hover:text-blue-900">{w.name}</Link>
                          {w.nickname && <p className="text-xs text-gray-500 italic">{w.nickname}</p>}
                          {w.passport_number && <p className="text-xs text-gray-400 font-mono">{w.passport_number}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 capitalize whitespace-nowrap">{w.gender ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{w.country_of_origin ?? '—'}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{expiryBadge(w.passport_expiry)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{expiryBadge(w.passport_permit_date)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{expiryBadge(w.typhoid_vaccine_expiry)}</td>
                    {isAdmin && (
                      <td className="px-2 py-3">
                        <Link href={`/admin/workers/${w.id}/edit`} className="inline-flex items-center justify-center w-7 h-7 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Edit"><Pencil className="w-3.5 h-3.5" /></Link>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : isLocal ? (
          /* ── DETAIL VIEW — LOCAL ─────────────────────── */
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <SortTh label="Name" col="name" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="min-w-[180px]" />
                  <SortTh label="Gender" col="gender" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Position" col="position" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Contact</th>
                  <SortTh label="Salary" col="salary" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Bank</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">KWSP</th>
                  {isAdmin && <th className="px-2 py-3 w-8" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((w) => (
                  <tr key={w.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/admin/workers/${w.id}`} className="font-medium text-blue-700 hover:text-blue-900 whitespace-nowrap">
                        {w.name}
                      </Link>
                      {w.nickname && <p className="text-xs text-gray-500 italic">{w.nickname}</p>}
                      {w.nric && <p className="text-xs text-gray-400 font-mono">{w.nric}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-600 capitalize whitespace-nowrap">{w.gender ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{w.positions?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{w.contact_number ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {w.current_salary != null ? `RM ${Number(w.current_salary).toFixed(0)}` : '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-gray-600">{w.bank ?? '—'}</div>
                      {w.bank_account_number && <div className="text-xs text-gray-400 font-mono">{w.bank_account_number}</div>}
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{w.kwsp ?? '—'}</td>
                    {isAdmin && (
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Link href={`/admin/workers/${w.id}/edit`} className="inline-flex items-center justify-center w-7 h-7 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Edit"><Pencil className="w-3.5 h-3.5" /></Link>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* ── DETAIL VIEW — FOREIGN ───────────────────── */
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <SortTh label="Name" col="name" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="min-w-[180px]" />
                  <SortTh label="Gender" col="gender" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Country</th>
                  <SortTh label="Salary" col="salary" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Passport Exp." col="passport_expiry" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="min-w-[140px]" />
                  <SortTh label="Permit Exp." col="permit_date" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="min-w-[130px]" />
                  <SortTh label="Typhoid Exp." col="typhoid" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="min-w-[130px]" />
                  {isAdmin && <th className="px-2 py-3 w-8" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((w) => (
                  <tr key={w.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/admin/workers/${w.id}`} className="font-medium text-blue-700 hover:text-blue-900 whitespace-nowrap">
                        {w.name}
                      </Link>
                      {w.nickname && <p className="text-xs text-gray-500 italic">{w.nickname}</p>}
                      {w.passport_number && <p className="text-xs text-gray-400 font-mono">{w.passport_number}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-600 capitalize whitespace-nowrap">{w.gender ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{w.country_of_origin ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {w.current_salary != null ? `RM ${Number(w.current_salary).toFixed(0)}` : '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{expiryBadge(w.passport_expiry)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{expiryBadge(w.passport_permit_date)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{expiryBadge(w.typhoid_vaccine_expiry)}</td>
                    {isAdmin && (
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Link href={`/admin/workers/${w.id}/edit`} className="inline-flex items-center justify-center w-7 h-7 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Edit"><Pencil className="w-3.5 h-3.5" /></Link>
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
        <p className="text-xs text-gray-500">
          {filtered.length} of {workers.filter(w => w.status === statusFilter && (!hideNoPermit || isLocal || !!w.passport_permit_date)).length} {workerType === 'foreign' ? 'caregivers' : 'local workers'}
        </p>
        {!isLocal && (
          <button
            onClick={() => setHideNoPermit(v => !v)}
            title={hideNoPermit ? 'Show all caregivers' : 'Hide caregivers without permit date'}
            className={`p-1 rounded transition-colors ${
              hideNoPermit
                ? 'text-amber-500 hover:text-amber-600'
                : 'text-gray-300 hover:text-gray-400'
            }`}
          >
            <CalendarOff className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}
