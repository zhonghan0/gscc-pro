'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, ArrowUpDown, ArrowUp, ArrowDown, Pencil, FileDown } from 'lucide-react'
import * as XLSX from 'xlsx'
import type { Resident } from '@/lib/types'
import { formatDate } from '@/lib/utils'
import { Input } from '@/components/ui/input'

interface ResidentTableProps {
  residents: Resident[]
  isAdmin: boolean
}

type WorkerRef = { name: string; nickname?: string | null }

const CONDITION_LABEL: Record<string, string> = {
  mobile: 'Mobile',
  wheelchair_bound: 'Wheelchair',
  bedridden: 'Bedridden',
}

const PHYSIO_LABEL: Record<string, string> = {
  yes: 'Yes',
  no: 'No',
  foc: 'FOC',
  alternate_day: 'Alt. Day',
}

function ageFromDob(dob: string | null): number | null {
  if (!dob) return null
  const age = Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 3600 * 1000))
  return age > 0 ? age : null
}

function caregiverDisplay(r: Resident): string {
  const w = (r as unknown as { workers?: WorkerRef }).workers
  return w ? (w.nickname || w.name) : '—'
}

const VIEW_LABEL: Record<string, string> = {
  summary: 'Summary', physio: 'Physio', package: 'Package', condition: 'Condition', all: 'All',
}

const CONDITION_LABEL_EXPORT: Record<string, string> = {
  mobile: 'Mobile', wheelchair_bound: 'Wheelchair', bedridden: 'Bedridden',
}
const PHYSIO_LABEL_EXPORT: Record<string, string> = {
  yes: 'Yes', no: 'No', foc: 'FOC', alternate_day: 'Alt. Day',
}

function exportToExcel(rows: Resident[], viewMode: string) {
  const now = new Date()
  const dd = String(now.getDate()).padStart(2, '0')
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const yy = String(now.getFullYear()).slice(-2)
  const viewName = VIEW_LABEL[viewMode] ?? viewMode
  const fileName = `${dd}${mm}${yy}-Graceville-Residents-${viewName}.xlsx`

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type Row = Record<string, any>

  const data: Row[] = rows.map(r => {
    const age = ageFromDob(r.date_of_birth)
    const caregiver = caregiverDisplay(r)
    const condition = r.condition ? (CONDITION_LABEL_EXPORT[r.condition] ?? r.condition) : ''
    const physio = r.physio ? (PHYSIO_LABEL_EXPORT[r.physio] ?? r.physio) : 'No'
    const healthRemark = (r as unknown as { health_remark?: string | null }).health_remark ?? ''

    if (viewMode === 'summary') return {
      'Name': r.full_name, 'NRIC': r.nric ?? '', 'Gender': r.gender ?? '',
      'Age': age ?? '', 'Condition': condition, 'Date of Admission': r.admission_date ?? '',
    }
    if (viewMode === 'physio') return {
      'Name': r.full_name, 'NRIC': r.nric ?? '', 'Physio': physio,
      'Physio Remark': r.physio_remark ?? '', 'Caregiver': caregiver,
    }
    if (viewMode === 'package') return {
      'Name': r.full_name, 'NRIC': r.nric ?? '', 'Condition': condition, 'Physio': physio,
      'NET': r.include_misc ? 'Yes' : 'No', 'Pay Day': r.pay_day ?? '',
      'Fee (RM)': r.fee ?? '', 'Package Remark': r.package_remark ?? '',
    }
    if (viewMode === 'condition') return {
      'Name': r.full_name, 'NRIC': r.nric ?? '', 'Gender': r.gender ?? '',
      'Age': age ?? '', 'Health Conditions': r.health_condition ?? '',
      'Health Remark': healthRemark,
    }
    // all
    return {
      'Name': r.full_name, 'NRIC': r.nric ?? '', 'Gender': r.gender ?? '',
      'Age': age ?? '', 'Condition': condition, 'Date of Admission': r.admission_date ?? '',
      'Physio': physio, 'Caregiver': caregiver,
      'NET': r.include_misc ? 'Yes' : 'No', 'Pay Day': r.pay_day ?? '',
      'Fee (RM)': r.fee ?? '', 'Health Conditions': r.health_condition ?? '',
      'Health Remark': healthRemark,
    }
  })

  const ws = XLSX.utils.json_to_sheet(data)

  // Bold the header row
  if (data.length > 0) {
    const headers = Object.keys(data[0])
    headers.forEach((_, colIdx) => {
      const cellAddr = XLSX.utils.encode_cell({ r: 0, c: colIdx })
      if (ws[cellAddr]) {
        ws[cellAddr].s = { font: { bold: true } }
      }
    })
  }

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, viewName)
  XLSX.writeFile(wb, fileName, { cellStyles: true })
}

type SortKey = 'name' | 'age' | 'admission' | 'physio' | 'physio_remark' | 'caregiver' | 'fee' | 'gender' | 'condition'
type SortDir = 'asc' | 'desc'
type ViewMode = 'summary' | 'physio' | 'package' | 'condition' | 'all'

const VIEW_TABS: { key: ViewMode; label: string }[] = [
  { key: 'summary',   label: 'Summary' },
  { key: 'physio',    label: 'Physio' },
  { key: 'package',   label: 'Package' },
  { key: 'condition', label: 'Condition' },
  { key: 'all',       label: 'All' },
]

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

function PlainTh({ label, className = '' }: { label: string; className?: string }) {
  return (
    <th className={`text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap ${className}`}>{label}</th>
  )
}

const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000

function isNew(r: Resident): boolean {
  if (!r.admission_date) return false
  return Date.now() - new Date(r.admission_date).getTime() < TWO_WEEKS_MS
}

function NameCell({ r }: { r: Resident }) {
  return (
    <td className="px-4 py-3 min-w-[160px]">
      <div className="flex items-center gap-2 whitespace-nowrap">
        <Link href={`/residents/${r.id}`} className="font-medium text-blue-700 hover:text-blue-900">
          {r.full_name}
        </Link>
        {isNew(r) && (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-700 leading-none">
            New
          </span>
        )}
      </div>
      {r.nric && <p className="text-xs text-gray-400 font-mono">{r.nric}</p>}
    </td>
  )
}

function EditCell({ r, isAdmin }: { r: Resident; isAdmin: boolean }) {
  if (!isAdmin) return null
  return (
    <td className="px-2 py-3 whitespace-nowrap">
      <Link href={`/residents/${r.id}/edit`} className="inline-flex items-center justify-center w-7 h-7 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Edit">
        <Pencil className="w-3.5 h-3.5" />
      </Link>
    </td>
  )
}

function ConditionBadge({ value }: { value: Resident['condition'] }) {
  if (!value) return <span className="text-gray-400">—</span>
  const cls = value === 'mobile' ? 'bg-green-100 text-green-700'
    : value === 'wheelchair_bound' ? 'bg-blue-100 text-blue-700'
    : 'bg-red-100 text-red-700'
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{CONDITION_LABEL[value]}</span>
}

function PhysioBadge({ value }: { value: Resident['physio'] }) {
  const cls = value === 'yes' ? 'bg-purple-100 text-purple-700'
    : value === 'foc' ? 'bg-orange-100 text-orange-700'
    : value === 'alternate_day' ? 'bg-teal-100 text-teal-700'
    : 'bg-gray-100 text-gray-500'
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {value ? (PHYSIO_LABEL[value] ?? value) : 'No'}
    </span>
  )
}

export function ResidentTable({ residents, isAdmin }: ResidentTableProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'active' | 'discharged'>('active')
  const [physioOnly, setPhysioOnly] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [viewMode, setViewMode] = useState<ViewMode>('summary')

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === 'a' || e.key === 'A') { e.preventDefault(); router.push('/residents/new') }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [router])

  function handleSort(col: SortKey) {
    if (col === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(col); setSortDir('asc') }
  }

  const CONDITION_ORDER = ['mobile', 'wheelchair_bound', 'bedridden', '']

  const filtered = residents
    .filter(r => {
      const matchesSearch =
        r.full_name.toLowerCase().includes(search.toLowerCase()) ||
        (r.nric ?? '').toLowerCase().includes(search.toLowerCase())
      if (!matchesSearch || r.status !== statusFilter) return false
      if (physioOnly && (!r.physio || r.physio === 'no')) return false
      return true
    })
    .sort((a, b) => {
      let cmp = 0
      if (sortKey === 'name')         cmp = a.full_name.localeCompare(b.full_name)
      else if (sortKey === 'age')     cmp = (ageFromDob(a.date_of_birth) ?? -1) - (ageFromDob(b.date_of_birth) ?? -1)
      else if (sortKey === 'admission') cmp = (a.admission_date ?? '').localeCompare(b.admission_date ?? '')
      else if (sortKey === 'condition') cmp = CONDITION_ORDER.indexOf(a.condition ?? '') - CONDITION_ORDER.indexOf(b.condition ?? '')
      else if (sortKey === 'physio') {
        const order = ['yes', 'foc', 'alternate_day', 'no', '']
        cmp = order.indexOf(a.physio ?? '') - order.indexOf(b.physio ?? '')
      }
      else if (sortKey === 'physio_remark') cmp = (a.physio_remark ?? '').localeCompare(b.physio_remark ?? '')
      else if (sortKey === 'caregiver') {
        cmp = caregiverDisplay(a).localeCompare(caregiverDisplay(b))
      }
      else if (sortKey === 'fee')     cmp = (a.fee ?? -1) - (b.fee ?? -1)
      else if (sortKey === 'gender')  cmp = (a.gender ?? '').localeCompare(b.gender ?? '')
      return sortDir === 'asc' ? cmp : -cmp
    })

  const sp = { sortKey, sortDir, onSort: handleSort }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search by name or NRIC…"
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
          <option value="discharged">Inactive</option>
        </select>
        <button
          onClick={() => exportToExcel(filtered, viewMode)}
          title={`Export ${VIEW_LABEL[viewMode]} to Excel`}
          className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-gray-300 bg-white text-gray-500 hover:text-green-600 hover:border-green-400 hover:bg-green-50 transition-colors"
        >
          <FileDown className="w-4 h-4" />
        </button>
      </div>

      {/* View tabs + physio filter */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 self-start w-fit">
          {VIEW_TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setViewMode(key)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                viewMode === key ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={physioOnly}
            onChange={e => setPhysioOnly(e.target.checked)}
            className="w-3.5 h-3.5 rounded accent-blue-600 cursor-pointer"
          />
          <span className="text-xs text-gray-600 font-medium whitespace-nowrap">Physio only</span>
        </label>
      </div>

      {/* Keyboard hints */}
      <p className="text-xs text-gray-400 select-none">
        <kbd className="font-mono">A</kbd> Add new
      </p>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <p className="text-sm">No residents found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">

                  {/* ── SUMMARY ── */}
                  {viewMode === 'summary' && <>
                    <SortTh label="Name" col="name" {...sp} className="min-w-[180px]" />
                    <SortTh label="Gender" col="gender" {...sp} />
                    <SortTh label="Age" col="age" {...sp} />
                    <SortTh label="Condition" col="condition" {...sp} />
                    <SortTh label="Date of Admission" col="admission" {...sp} />
                    {isAdmin && <th className="px-2 py-3 w-8" />}
                  </>}

                  {/* ── PHYSIO ── */}
                  {viewMode === 'physio' && <>
                    <SortTh label="Name" col="name" {...sp} className="min-w-[180px]" />
                    <SortTh label="Physio" col="physio" {...sp} />
                    <SortTh label="Physio Remark" col="physio_remark" {...sp} />
                    <SortTh label="Caregiver" col="caregiver" {...sp} />
                    {isAdmin && <th className="px-2 py-3 w-8" />}
                  </>}

                  {/* ── PACKAGE ── */}
                  {viewMode === 'package' && <>
                    <SortTh label="Name" col="name" {...sp} className="min-w-[180px]" />
                    <SortTh label="Condition" col="condition" {...sp} />
                    <SortTh label="Physio" col="physio" {...sp} />
                    <PlainTh label="NET" />
                    <PlainTh label="Pay Day" />
                    <SortTh label="Fee (RM)" col="fee" {...sp} />
                    <PlainTh label="Package Remark" />
                    {isAdmin && <th className="px-2 py-3 w-8" />}
                  </>}

                  {/* ── CONDITION ── */}
                  {viewMode === 'condition' && <>
                    <SortTh label="Name" col="name" {...sp} className="min-w-[180px]" />
                    <SortTh label="Gender" col="gender" {...sp} />
                    <SortTh label="Age" col="age" {...sp} />
                    <PlainTh label="Health Conditions" className="min-w-[200px]" />
                    <PlainTh label="Health Remark" className="min-w-[160px]" />
                    {isAdmin && <th className="px-2 py-3 w-8" />}
                  </>}

                  {/* ── ALL ── */}
                  {viewMode === 'all' && <>
                    <SortTh label="Name" col="name" {...sp} className="min-w-[180px]" />
                    <SortTh label="Gender" col="gender" {...sp} />
                    <SortTh label="Age" col="age" {...sp} />
                    <SortTh label="Condition" col="condition" {...sp} />
                    <SortTh label="Date of Admission" col="admission" {...sp} />
                    <SortTh label="Physio" col="physio" {...sp} />
                    <SortTh label="Caregiver" col="caregiver" {...sp} />
                    <PlainTh label="NET" />
                    <PlainTh label="Pay Day" />
                    <SortTh label="Fee (RM)" col="fee" {...sp} />
                    <PlainTh label="Health Info" />
                    {isAdmin && <th className="px-2 py-3 w-8" />}
                  </>}

                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">

                    {/* ── SUMMARY ── */}
                    {viewMode === 'summary' && <>
                      <NameCell r={r} />
                      <td className="px-4 py-3 text-gray-600 capitalize whitespace-nowrap">{r.gender ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {ageFromDob(r.date_of_birth) != null ? `${ageFromDob(r.date_of_birth)} yrs` : '—'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap"><ConditionBadge value={r.condition} /></td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatDate(r.admission_date)}</td>
                      <EditCell r={r} isAdmin={isAdmin} />
                    </>}

                    {/* ── PHYSIO ── */}
                    {viewMode === 'physio' && <>
                      <NameCell r={r} />
                      <td className="px-4 py-3 whitespace-nowrap"><PhysioBadge value={r.physio} /></td>
                      <td className="px-4 py-3 text-gray-600 text-xs max-w-[200px]">{r.physio_remark ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">{caregiverDisplay(r)}</td>
                      <EditCell r={r} isAdmin={isAdmin} />
                    </>}

                    {/* ── PACKAGE ── */}
                    {viewMode === 'package' && <>
                      <NameCell r={r} />
                      <td className="px-4 py-3 whitespace-nowrap"><ConditionBadge value={r.condition} /></td>
                      <td className="px-4 py-3 whitespace-nowrap"><PhysioBadge value={r.physio} /></td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${r.include_misc ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {r.include_misc ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{r.pay_day ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {r.fee != null ? `RM ${Number(r.fee).toFixed(0)}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs max-w-[180px] truncate">{r.package_remark ?? '—'}</td>
                      <EditCell r={r} isAdmin={isAdmin} />
                    </>}

                    {/* ── CONDITION ── */}
                    {viewMode === 'condition' && <>
                      <NameCell r={r} />
                      <td className="px-4 py-3 text-gray-600 capitalize whitespace-nowrap">{r.gender ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {ageFromDob(r.date_of_birth) != null ? `${ageFromDob(r.date_of_birth)} yrs` : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-700 max-w-[240px]">
                        {r.health_condition
                          ? <span className="text-indigo-700">{r.health_condition}</span>
                          : <span className="text-amber-600 italic">Unfilled</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 max-w-[180px]">
                        {(r as unknown as { health_remark?: string | null }).health_remark ?? '—'}
                      </td>
                      <EditCell r={r} isAdmin={isAdmin} />
                    </>}

                    {/* ── ALL ── */}
                    {viewMode === 'all' && <>
                      <NameCell r={r} />
                      <td className="px-4 py-3 text-gray-600 capitalize whitespace-nowrap">{r.gender ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {ageFromDob(r.date_of_birth) != null ? `${ageFromDob(r.date_of_birth)} yrs` : '—'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap"><ConditionBadge value={r.condition} /></td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatDate(r.admission_date)}</td>
                      <td className="px-4 py-3 whitespace-nowrap"><PhysioBadge value={r.physio} /></td>
                      <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">{caregiverDisplay(r)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${r.include_misc ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {r.include_misc ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{r.pay_day ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {r.fee != null ? `RM ${Number(r.fee).toFixed(0)}` : '—'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {r.health_condition
                          ? <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Filled</span>
                          : <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Unfilled</span>}
                      </td>
                      <EditCell r={r} isAdmin={isAdmin} />
                    </>}

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-500">{filtered.length} of {residents.length} residents</p>
    </div>
  )
}
