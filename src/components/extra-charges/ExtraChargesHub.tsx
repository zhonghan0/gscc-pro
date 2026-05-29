'use client'

import React, { useState, useEffect, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronLeft, ChevronRight, Plus, Trash2, ExternalLink,
  Settings2, Eye, EyeOff, Repeat2, RefreshCw, Search, X, Check, Loader2,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { AddExtraChargeForm } from './AddExtraChargeForm'
import { ResidentCustomPrices } from './ResidentCustomPrices'
import { ResidentRecurringCharges } from './ResidentRecurringCharges'
import { deleteExtraCharge, updateExtraCharge } from '@/actions/extra-charges'
import { applyAllRecurringCharges } from '@/actions/recurring-charges'
import { cn } from '@/lib/utils'

interface Resident {
  id: string
  full_name: string
  fee: number | null
  status: 'active' | 'discharged'
  date_of_discharge: string | null
}

interface Charge {
  id: string
  resident_id: string
  charge_date: string | null
  description: string
  amount: number
  billing_month: string
  notes: string | null
  recurring_charge_id: string | null
}

interface ChargeItem {
  id: string
  name: string
  default_price: number
  unit: string | null
}

interface ResidentPrice {
  resident_id: string
  charge_item_id: string
  price: number
}

interface RecurringCharge {
  id: string
  resident_id: string
  charge_item_id: string | null
  description: string
  amount: number
  active: boolean
  sort_order: number
}

interface Props {
  month: string
  currentMonth: string
  hasExplicitMonth: boolean
  residents: Resident[]
  charges: Charge[]
  chargeItems: ChargeItem[]
  residentPrices: ResidentPrice[]
  recurringCharges: RecurringCharge[]
  isAdmin: boolean
}

function prevMonth(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 2, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function nextMonth(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function fmtMonth(ym: string): string {
  const [y, m] = ym.split('-')
  return new Date(parseInt(y), parseInt(m) - 1, 1).toLocaleDateString('en-MY', { month: 'long', year: 'numeric' })
}

function DeleteChargeBtn({ chargeId, residentId }: { chargeId: string; residentId: string }) {
  const [confirm, setConfirm] = useState(false)
  const [, startTransition] = useTransition()
  const router = useRouter()

  if (!confirm) {
    return (
      <button
        onClick={(e) => { e.stopPropagation(); setConfirm(true) }}
        className="ml-1 opacity-0 group-hover/line:opacity-100 text-gray-300 hover:text-red-500 transition-all"
        title="Delete"
      >
        <Trash2 className="w-3 h-3" />
      </button>
    )
  }
  return (
    <span className="ml-1 flex items-center gap-0.5 text-xs" onClick={e => e.stopPropagation()}>
      <button
        className="text-red-600 hover:underline font-semibold"
        onClick={() => startTransition(async () => {
          await deleteExtraCharge(chargeId, residentId)
          router.refresh()
        })}
      >
        Del
      </button>
      <span className="text-blue-300">·</span>
      <button className="text-blue-500 hover:underline" onClick={() => setConfirm(false)}>No</button>
    </span>
  )
}

const STORAGE_KEY = 'extraChargesMonth'

/** Format YYYY-MM-DD → "12/5" (day/month, no leading zeros) */
function shortDate(d: string | null): string {
  if (!d) return ''
  const [, m, day] = d.split('-')
  return `${parseInt(day)}/${parseInt(m)}`
}

/** Sort charges: Recurring → Transport → everything else (editing item keeps its position) */
function sortCharges(charges: Charge[]): Charge[] {
  const priority = (c: Charge): number => {
    if (c.recurring_charge_id) return 1
    if (/transport/i.test(c.description)) return 2
    return 3
  }
  return [...charges].sort((a, b) => priority(a) - priority(b))
}

type PanelType = 'add' | 'custom' | 'recurring' | 'edit' | null

export function ExtraChargesHub({
  month, currentMonth, hasExplicitMonth,
  residents, charges, chargeItems, residentPrices, recurringCharges, isAdmin,
}: Props) {
  const router = useRouter()
  const [openPanel, setOpenPanel] = useState<{ id: string; type: PanelType }>({ id: '', type: null })
  const [hideEmpty, setHideEmpty] = useState(true)
  const [applyingAll, setApplyingAll] = useState(false)
  const [search, setSearch] = useState('')

  // Inline charge edit
  const [editingCharge, setEditingCharge] = useState<Charge | null>(null)
  const [editDate, setEditDate] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editAmount, setEditAmount] = useState('')
  const [editMonth, setEditMonth] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')

  function openEditCharge(charge: Charge) {
    setEditingCharge(charge)
    setEditDate(charge.charge_date ?? '')
    setEditDesc(charge.description)
    setEditAmount(String(charge.amount))
    setEditMonth(charge.billing_month)
    setEditError('')
    setOpenPanel({ id: charge.resident_id, type: 'edit' })
  }

  async function saveEditCharge() {
    if (!editingCharge) return
    const amount = parseFloat(editAmount)
    if (isNaN(amount)) { setEditError('Invalid amount'); return }
    setEditSaving(true)
    setEditError('')
    try {
      await updateExtraCharge(editingCharge.id, editingCharge.resident_id, {
        charge_date: editDate,
        description: editDesc.trim(),
        amount,
        billing_month: editMonth,
      })
      setOpenPanel({ id: '', type: null })
      setEditingCharge(null)
      router.refresh()
    } catch (e) {
      setEditError(e instanceof Error ? e.message : 'Error saving')
    } finally {
      setEditSaving(false)
    }
  }

  function cancelEditCharge() {
    setOpenPanel({ id: '', type: null })
    setEditingCharge(null)
    setEditError('')
  }

  // Esc cancels editing
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && editingCharge) cancelEditCharge()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingCharge])

  // Scroll add panel into view and focus first input when it opens
  useEffect(() => {
    if (openPanel.type !== 'add' || !openPanel.id) return
    const id = openPanel.id
    setTimeout(() => {
      const row = document.querySelector<HTMLElement>(`[data-add-panel="${id}"]`)
      if (row) {
        row.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        const firstInput = row.querySelector<HTMLElement>('input, select, textarea')
        firstInput?.focus()
      }
    }, 50)
  }, [openPanel])

  // ── Quick-add modal ──────────────────────────────────────────────────────────
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [qaResident, setQaResident] = useState<Resident | null>(null)
  const [qaSearch, setQaSearch] = useState('')
  const [qaHighlight, setQaHighlight] = useState(0)
  const qaSearchRef = useRef<HTMLInputElement>(null)
  const qaListRef = useRef<HTMLUListElement>(null)

  const qaFiltered = residents.filter(r =>
    r.full_name.toLowerCase().includes(qaSearch.toLowerCase())
  )

  function openQuickAdd() {
    setShowQuickAdd(true)
    setQaResident(null)
    setQaSearch('')
    setQaHighlight(0)
    // Focus search after paint
    setTimeout(() => qaSearchRef.current?.focus(), 50)
  }

  function closeQuickAdd() {
    setShowQuickAdd(false)
    setQaResident(null)
    setQaSearch('')
    setQaHighlight(0)
  }

  function selectQaResident(r: Resident) {
    setQaResident(r)
    setQaSearch('')
    setQaHighlight(0)
  }

  function handleQaSearchKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setQaHighlight(h => Math.min(h + 1, qaFiltered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setQaHighlight(h => Math.max(h - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (qaFiltered[qaHighlight]) selectQaResident(qaFiltered[qaHighlight])
    } else if (e.key === 'Escape') {
      e.preventDefault()
      closeQuickAdd()
    }
  }

  // Keyboard shortcut: N → open quick-add
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === 'a' || e.key === 'A') {
        e.preventDefault()
        openQuickAdd()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Restore last-visited month
  useEffect(() => {
    if (!hasExplicitMonth) {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved && saved !== month) router.replace(`/extra-charges?month=${saved}`)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, month)
  }, [month])

  // Group charges by resident
  const chargesByResident = new Map<string, Charge[]>()
  for (const c of charges) {
    const arr = chargesByResident.get(c.resident_id) ?? []
    arr.push(c)
    chargesByResident.set(c.resident_id, arr)
  }

  // Which recurring charge IDs have already been applied this month
  const appliedRecurringIds = new Set(
    charges.filter(c => c.recurring_charge_id).map(c => c.recurring_charge_id as string)
  )

  // Group recurring charges by resident
  const recurringByResident = new Map<string, RecurringCharge[]>()
  for (const r of recurringCharges) {
    const arr = recurringByResident.get(r.resident_id) ?? []
    arr.push(r)
    recurringByResident.set(r.resident_id, arr)
  }

  // Count residents with unapplied active recurring charges
  const residentsWithUnapplied = residents.filter(r => {
    const recs = recurringByResident.get(r.id) ?? []
    return recs.some(rc => rc.active && !appliedRecurringIds.has(rc.id))
  })

  const totalExtras = charges.reduce((s, c) => s + c.amount, 0)
  const residentsWithCharges = new Set(charges.map(c => c.resident_id)).size

  const q = search.trim().toLowerCase()
  const visibleResidents = residents.filter(r => {
    if (hideEmpty && !chargesByResident.has(r.id)) return false
    if (!q) return true
    if (r.full_name.toLowerCase().includes(q)) return true
    return (chargesByResident.get(r.id) ?? []).some(c =>
      c.description.toLowerCase().includes(q)
    )
  })

  function togglePanel(residentId: string, type: PanelType) {
    setOpenPanel(prev =>
      prev.id === residentId && prev.type === type
        ? { id: '', type: null }
        : { id: residentId, type }
    )
  }

  async function handleApplyAll() {
    setApplyingAll(true)
    try {
      await applyAllRecurringCharges(month)
      router.refresh()
    } finally {
      setApplyingAll(false)
    }
  }


  return (
    <div className="space-y-4">

      {/* ── Quick-Add Charge Modal ─────────────────────────────────────────────── */}
      {showQuickAdd && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4"
          onClick={e => { if (e.target === e.currentTarget) closeQuickAdd() }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" aria-hidden />

          {/* Panel */}
          <div className="relative z-10 w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-600" />
                <h2 className="text-sm font-semibold text-gray-900">Add Charge</h2>
              </div>
              <button
                onClick={closeQuickAdd}
                className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                title="Close (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              {/* Step 1: Resident picker */}
              {!qaResident ? (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Select Resident</p>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input
                      ref={qaSearchRef}
                      type="text"
                      value={qaSearch}
                      onChange={e => { setQaSearch(e.target.value); setQaHighlight(0) }}
                      onKeyDown={handleQaSearchKey}
                      placeholder="Type a name to search…"
                      className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  {qaFiltered.length > 0 ? (
                    <ul
                      ref={qaListRef}
                      className="mt-1 max-h-56 overflow-y-auto border border-gray-200 rounded-lg bg-white divide-y divide-gray-100 shadow-sm"
                    >
                      {qaFiltered.map((r, i) => (
                        <li key={r.id}>
                          <button
                            type="button"
                            onClick={() => selectQaResident(r)}
                            className={cn(
                              'w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-2',
                              i === qaHighlight
                                ? 'bg-blue-50 text-blue-800'
                                : 'hover:bg-gray-50 text-gray-800'
                            )}
                          >
                            <span className="flex-1 font-medium">{r.full_name}</span>
                            {r.status === 'discharged' && (
                              <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">Discharged</span>
                            )}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : qaSearch ? (
                    <p className="mt-2 text-sm text-gray-400 text-center py-2">No residents match &quot;{qaSearch}&quot;</p>
                  ) : (
                    <p className="mt-2 text-xs text-gray-400 text-center py-2">Start typing to filter residents</p>
                  )}
                  <p className="mt-3 text-xs text-gray-400 flex items-center gap-1">
                    <kbd className="border border-gray-300 rounded px-1 py-0.5 font-mono text-[10px]">↑↓</kbd> navigate
                    <span className="mx-1">·</span>
                    <kbd className="border border-gray-300 rounded px-1 py-0.5 font-mono text-[10px]">Enter</kbd> select
                    <span className="mx-1">·</span>
                    <kbd className="border border-gray-300 rounded px-1 py-0.5 font-mono text-[10px]">Esc</kbd> close
                  </p>
                </div>
              ) : (
                /* Step 2: Charge form */
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setQaResident(null)}
                        className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                      >
                        <ChevronLeft className="w-3 h-3" /> Change resident
                      </button>
                      <span className="text-gray-300">·</span>
                      <span className="text-sm font-semibold text-gray-900">{qaResident.full_name}</span>
                    </div>
                  </div>
                  <AddExtraChargeForm
                    residentId={qaResident.id}
                    chargeItems={chargeItems}
                    residentPrices={residentPrices
                      .filter(p => p.resident_id === qaResident.id)
                      .map(p => ({ charge_item_id: p.charge_item_id, price: p.price }))}
                    defaultBillingMonth={nextMonth(month)}
                    onDone={() => { closeQuickAdd(); router.refresh() }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Month navigation + search + summary */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => router.push(`/extra-charges?month=${prevMonth(month)}`)}
            className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="font-semibold text-gray-900 w-44 text-center text-base">{fmtMonth(month)}</span>
          <button
            onClick={() => router.push(`/extra-charges?month=${nextMonth(month)}`)}
            className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search resident or item…"
            className="w-full pl-8 pr-7 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 text-sm text-gray-500 flex-shrink-0">
          <span>
            <span className="font-semibold text-gray-900">{residentsWithCharges}</span>{' '}billed
          </span>
          <span>
            Total: <span className="font-semibold text-gray-900">RM {totalExtras.toFixed(2)}</span>
          </span>
          <button
            onClick={() => setHideEmpty(h => !h)}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors',
              hideEmpty
                ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
                : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
            )}
          >
            {hideEmpty ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {hideEmpty ? `Billed only (${residentsWithCharges})` : 'Show all'}
          </button>

          {/* Global add charge button */}
          <button
            onClick={openQuickAdd}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            title="Add Charge (N)"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Charge
            <kbd className="ml-0.5 text-[10px] opacity-70 border border-white/40 rounded px-1 py-0.5 font-mono leading-none">A</kbd>
          </button>
        </div>
      </div>


      {/* Recurring apply-all banner */}
      {isAdmin && residentsWithUnapplied.length > 0 && (
        <div className="flex items-center justify-between bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
          <div className="flex items-center gap-2 text-sm">
            <Repeat2 className="w-4 h-4 text-orange-500 flex-shrink-0" />
            <span className="text-orange-800">
              <span className="font-semibold">{residentsWithUnapplied.length}</span>
              {' '}resident{residentsWithUnapplied.length > 1 ? 's' : ''} have recurring charges not yet applied for{' '}
              <span className="font-semibold">{fmtMonth(month)}</span>
            </span>
          </div>
          <button
            onClick={handleApplyAll}
            disabled={applyingAll}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 transition-colors ml-4 flex-shrink-0"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', applyingAll && 'animate-spin')} />
            {applyingAll ? 'Applying…' : 'Apply All'}
          </button>
        </div>
      )}

      {/* Residents table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-56">Resident</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Charges This Month</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-32">Total</th>
              <th className="px-4 py-3 w-28"></th>
            </tr>
          </thead>
          <tbody>
            {visibleResidents.map(resident => {
              const resCharges = chargesByResident.get(resident.id) ?? []
              const sortedCharges = sortCharges(resCharges)
              const extrasTotal = resCharges.reduce((s, c) => s + c.amount, 0)
              const fee = resident.fee ?? 0
              const total = fee + extrasTotal
              const panel = openPanel.id === resident.id ? openPanel.type : null
              const residentPricesFiltered = residentPrices
                .filter(p => p.resident_id === resident.id)
                .map(p => ({ charge_item_id: p.charge_item_id, price: p.price }))
              const resRecurring = recurringByResident.get(resident.id) ?? []
              const hasUnapplied = resRecurring.some(r => r.active && !appliedRecurringIds.has(r.id))
              const hasRecurring = resRecurring.length > 0

              return (
                <React.Fragment key={resident.id}>
                  <tr className={cn(
                    'border-t border-gray-100 first:border-t-0 transition-colors',
                    panel ? 'bg-gray-50/60' : 'hover:bg-gray-50'
                  )}>
                    {/* Resident name */}
                    <td className="px-4 py-3 align-top">
                      <Link
                        href={`/residents/${resident.id}`}
                        className={cn(
                          'font-medium hover:text-blue-600 transition-colors leading-snug block',
                          resident.status === 'discharged' ? 'text-gray-400' : 'text-gray-900'
                        )}
                      >
                        {resident.full_name.includes('@') ? (
                          <>
                            {resident.full_name.split('@')[0].trim()}
                            <span className="block text-xs font-normal text-gray-400">
                              @ {resident.full_name.split('@').slice(1).join('@').trim()}
                            </span>
                          </>
                        ) : resident.full_name}
                      </Link>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {resident.status === 'discharged' && (
                          <span className="text-xs bg-gray-100 text-gray-400 rounded-full px-2 py-0.5 font-medium">Discharged</span>
                        )}
                        {hasUnapplied && (
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0" title="Has unapplied recurring charges" />
                        )}
                      </div>
                    </td>

                    {/* Charges — line by line */}
                    <td className="px-4 py-2.5">
                      {sortedCharges.length === 0 ? (
                        <span className="text-xs text-gray-300 italic">None</span>
                      ) : (
                        <div className="divide-y divide-gray-50">
                          {sortedCharges.map(c => {
                            const isEditing = editingCharge?.id === c.id
                            const isBill = !c.recurring_charge_id && !/transport/i.test(c.description)
                            const isTransport = !c.recurring_charge_id && /transport/i.test(c.description)
                            return (
                              <div
                                key={c.id}
                                className={cn(
                                  'group/line flex items-center gap-2 py-1',
                                  isAdmin && 'cursor-pointer'
                                )}
                                onClick={isAdmin ? () => openEditCharge(c) : undefined}
                                title={isAdmin ? 'Click to edit' : undefined}
                              >
                                {/* colour dot */}
                                <span className={cn(
                                  'w-1.5 h-1.5 rounded-full flex-shrink-0',
                                  isEditing ? 'bg-yellow-400'
                                  : c.recurring_charge_id ? 'bg-orange-400'
                                  : isTransport ? 'bg-blue-400'
                                  : 'bg-green-400'
                                )} />
                                {/* date */}
                                <span className="text-xs text-gray-400 w-8 flex-shrink-0 tabular-nums">
                                  {shortDate(c.charge_date)}
                                </span>
                                {/* recurring icon */}
                                {c.recurring_charge_id && <Repeat2 className="w-3 h-3 text-orange-400 flex-shrink-0" />}
                                {/* description */}
                                <span className={cn(
                                  'flex-1 text-sm min-w-0',
                                  isEditing ? 'text-yellow-700 font-medium'
                                  : c.recurring_charge_id ? 'text-orange-700'
                                  : isTransport ? 'text-blue-700'
                                  : isBill ? 'text-green-700'
                                  : 'text-gray-800'
                                )}>
                                  {c.description}
                                </span>
                                {/* amount */}
                                <span className="text-sm tabular-nums text-gray-700 flex-shrink-0">
                                  RM {Number(c.amount).toFixed(2)}
                                </span>
                                {/* delete */}
                                {isAdmin && (
                                  <span onClick={e => e.stopPropagation()}>
                                    <DeleteChargeBtn chargeId={c.id} residentId={resident.id} />
                                  </span>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </td>

                    {/* Total + base fee */}
                    <td className="px-4 py-3 text-right align-top tabular-nums">
                      <span className={cn('text-sm font-semibold block', extrasTotal > 0 ? 'text-gray-900' : 'text-gray-500')}>
                        RM {total.toFixed(2)}
                      </span>
                      <span className="text-xs text-gray-400 mt-0.5 block">Base RM {fee.toFixed(2)}</span>
                    </td>

                    {/* Actions */}
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {isAdmin && (
                          <>
                            {/* Recurring */}
                            <button
                              onClick={() => togglePanel(resident.id, 'recurring')}
                              className={cn(
                                'p-1.5 rounded-md transition-colors relative',
                                panel === 'recurring'
                                  ? 'bg-orange-100 text-orange-600'
                                  : hasRecurring
                                    ? 'text-orange-400 hover:text-orange-600 hover:bg-orange-50'
                                    : 'text-gray-300 hover:text-orange-500 hover:bg-orange-50'
                              )}
                              title="Recurring charges"
                            >
                              <Repeat2 className="w-3.5 h-3.5" />
                              {hasUnapplied && (
                                <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-orange-400" />
                              )}
                            </button>
                            {/* Custom prices */}
                            <button
                              onClick={() => togglePanel(resident.id, 'custom')}
                              className={cn(
                                'p-1.5 rounded-md transition-colors',
                                panel === 'custom'
                                  ? 'bg-purple-100 text-purple-600'
                                  : 'text-gray-300 hover:text-purple-500 hover:bg-purple-50'
                              )}
                              title="Custom prices"
                            >
                              <Settings2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        {/* Add charge */}
                        <button
                          onClick={() => togglePanel(resident.id, 'add')}
                          className={cn(
                            'p-1.5 rounded-md transition-colors',
                            panel === 'add'
                              ? 'bg-blue-100 text-blue-600'
                              : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'
                          )}
                          title="Add charge"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                        {/* Statement */}
                        <Link
                          href={`/residents/${resident.id}/statement?month=${month}`}
                          className="p-1.5 rounded-md text-gray-300 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="View statement"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </td>
                  </tr>

                  {/* Add charge panel */}
                  {panel === 'add' && (
                    <tr className="border-t border-blue-100 bg-blue-50/60" data-add-panel={resident.id}>
                      <td colSpan={4} className="px-6 py-4">
                        <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-3">
                          Add Charge — {resident.full_name}
                        </p>
                        <AddExtraChargeForm
                          residentId={resident.id}
                          chargeItems={chargeItems}
                          residentPrices={residentPricesFiltered}
                          defaultBillingMonth={nextMonth(month)}
                          onDone={() => { setOpenPanel({ id: '', type: null }); router.refresh() }}
                        />
                      </td>
                    </tr>
                  )}

                  {/* Custom prices panel */}
                  {panel === 'custom' && (
                    <tr className="border-t border-purple-100 bg-purple-50/40">
                      <td colSpan={4} className="px-6 py-4">
                        <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-3">
                          Custom Prices — {resident.full_name}
                        </p>
                        <ResidentCustomPrices
                          residentId={resident.id}
                          chargeItems={chargeItems}
                          residentPrices={residentPricesFiltered}
                          isAdmin={isAdmin}
                        />
                      </td>
                    </tr>
                  )}

                  {/* Recurring charges panel */}
                  {panel === 'recurring' && (
                    <tr className="border-t border-orange-100 bg-orange-50/30">
                      <td colSpan={4} className="px-6 py-4">
                        <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide mb-3">
                          Recurring Charges — {resident.full_name}
                        </p>
                        <ResidentRecurringCharges
                          residentId={resident.id}
                          billingMonth={month}
                          chargeItems={chargeItems}
                          residentPrices={residentPricesFiltered}
                          recurringCharges={resRecurring}
                          appliedIds={appliedRecurringIds}
                          onApplied={() => router.refresh()}
                        />
                      </td>
                    </tr>
                  )}

                  {/* Edit charge panel */}
                  {panel === 'edit' && editingCharge && editingCharge.resident_id === resident.id && (
                    <tr className="border-t border-yellow-200 bg-yellow-50/60">
                      <td colSpan={4} className="px-6 py-4">
                        <p className="text-xs font-semibold text-yellow-700 uppercase tracking-wide mb-3">
                          Edit Charge — {editingCharge.description}
                        </p>
                        <div className="flex flex-wrap items-end gap-2">
                          <div className="flex flex-col gap-0.5">
                            <label className="text-xs text-gray-500">Date</label>
                            <Input
                              type="date"
                              value={editDate}
                              onChange={e => setEditDate(e.target.value)}
                              className="h-7 text-xs w-32"
                              autoFocus
                              onKeyDown={e => { if (e.key === 'Enter') saveEditCharge(); if (e.key === 'Escape') cancelEditCharge() }}
                            />
                          </div>
                          <div className="flex flex-col gap-0.5 flex-1 min-w-40">
                            <label className="text-xs text-gray-500">Description</label>
                            <Input
                              value={editDesc}
                              onChange={e => setEditDesc(e.target.value)}
                              className="h-7 text-xs"
                              onKeyDown={e => { if (e.key === 'Enter') saveEditCharge(); if (e.key === 'Escape') cancelEditCharge() }}
                            />
                          </div>
                          <div className="flex flex-col gap-0.5">
                            <label className="text-xs text-gray-500">Amount (RM)</label>
                            <Input
                              type="number"
                              step="0.01"
                              value={editAmount}
                              onChange={e => setEditAmount(e.target.value)}
                              className="h-7 text-xs w-24"
                              onKeyDown={e => { if (e.key === 'Enter') saveEditCharge(); if (e.key === 'Escape') cancelEditCharge() }}
                            />
                          </div>
                          <div className="flex flex-col gap-0.5">
                            <label className="text-xs text-gray-500">Billing month</label>
                            <Input
                              type="month"
                              value={editMonth}
                              onChange={e => setEditMonth(e.target.value)}
                              className="h-7 text-xs w-32"
                              onKeyDown={e => { if (e.key === 'Enter') saveEditCharge(); if (e.key === 'Escape') cancelEditCharge() }}
                            />
                          </div>
                          <div className="flex items-center gap-1 pb-0.5">
                            <button
                              onClick={saveEditCharge}
                              disabled={editSaving}
                              className="flex items-center justify-center w-7 h-7 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                              title="Save"
                            >
                              {editSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              onClick={cancelEditCharge}
                              className="flex items-center gap-1 px-2 h-7 rounded border border-gray-200 text-gray-500 hover:bg-gray-100 text-xs"
                              title="Cancel (Esc)"
                            >
                              <X className="w-3 h-3" />
                              <kbd className="text-[10px] text-gray-400 font-mono">Esc</kbd>
                            </button>
                          </div>
                        </div>
                        {editError && <p className="text-xs text-red-600 mt-1.5">{editError}</p>}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>

        {visibleResidents.length === 0 && (
          <div className="px-4 py-12 text-center text-sm text-gray-400">
            {q ? `No results for "${search}".` : hideEmpty ? 'No residents have extra charges this month.' : 'No active residents found.'}
          </div>
        )}
      </div>
    </div>
  )
}
