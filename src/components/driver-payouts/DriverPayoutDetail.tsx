'use client'

import { useRef, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Camera, Plus, Trash2, Check, X, Loader2,
  CheckCircle2, Clock, ChevronUp, ChevronDown, ArrowUpDown, Eye, EyeOff,
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  createDriverPayoutTrip,
  deleteDriverPayoutTrip,
  updateDriverPayout,
  updateDriverPayoutTrip,
} from '@/actions/driver-payouts'
import { computePeriodLabel } from './periodLabel'

interface Trip {
  id: string
  trip_date: string | null
  description: string
  transport_amount: number
  bill_amount: number
  sort_order: number
}

interface Worker {
  id: string
  name: string
  nickname: string | null
}

interface Payout {
  id: string
  worker_id: string | null
  notes: string | null
  finalized: boolean
  worker: Worker | null
}

interface Props {
  payout: Payout
  trips: Trip[]
  knownDescriptions: string[]
}

function fmtDate(d: string): string {
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

function fmtRM(n: number): string {
  return n.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const DEFAULT_TRANSPORT = 70

export function DriverPayoutDetail({ payout, trips: initialTrips, knownDescriptions }: Props) {
  const router = useRouter()
  const printRef = useRef<HTMLDivElement>(null)
  const [trips, setTrips] = useState<Trip[]>(initialTrips)
  const [copying, setCopying] = useState(false)
  const [copied, setCopied] = useState(false)
  const [preview, setPreview] = useState(false)

  // Date sort: null = insertion order, 'asc' = oldest first, 'desc' = newest first
  const [sortDir, setSortDir] = useState<'asc' | 'desc' | null>(null)

  const sortedTrips = useMemo(() => {
    if (!sortDir) return trips
    return [...trips].sort((a, b) => {
      const da = a.trip_date ?? ''
      const db = b.trip_date ?? ''
      if (da === db) return 0
      if (!da) return 1
      if (!db) return -1
      return sortDir === 'asc' ? da.localeCompare(db) : db.localeCompare(da)
    })
  }, [trips, sortDir])

  function cycleSort() {
    setSortDir(prev => prev === null ? 'asc' : prev === 'asc' ? 'desc' : null)
  }

  // Add trip form
  const [showAdd, setShowAdd] = useState(false)
  const [addDate, setAddDate] = useState(() => {
    const dates = initialTrips.map(t => t.trip_date).filter(Boolean) as string[]
    return dates.length > 0 ? [...dates].sort().at(-1)! : ''
  })
  const [addDesc, setAddDesc] = useState('')
  const [addTransport, setAddTransport] = useState(String(DEFAULT_TRANSPORT))
  const [addBill, setAddBill] = useState('')
  const [addSaving, setAddSaving] = useState(false)
  const [addError, setAddError] = useState('')

  // Inline edit
  const [editId, setEditId] = useState<string | null>(null)
  const [editDate, setEditDate] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editTransport, setEditTransport] = useState('')
  const [editBill, setEditBill] = useState('')
  const [editSaving, setEditSaving] = useState(false)

  const [finalizing, setFinalizing] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const transportTotal = trips.reduce((s, t) => s + t.transport_amount, 0)
  const billTotal = trips.reduce((s, t) => s + t.bill_amount, 0)
  const grandTotal = transportTotal + billTotal

  const driverName = payout.worker?.nickname ?? payout.worker?.name ?? 'Unknown'
  const period = computePeriodLabel(trips.map(t => t.trip_date))

  function shiftAddDate(delta: number) {
    if (!addDate) return
    const [y, m, d] = addDate.split('-').map(Number)
    const date = new Date(y, m - 1, d)
    date.setDate(date.getDate() + delta)
    setAddDate(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`)
  }

  async function handleAddTrip(e: React.FormEvent) {
    e.preventDefault()
    if (!addDesc.trim()) { setAddError('Description is required'); return }
    const transport = parseFloat(addTransport) || 0
    const bill = parseFloat(addBill) || 0
    setAddSaving(true)
    setAddError('')
    try {
      const id = await createDriverPayoutTrip({
        payout_id: payout.id,
        trip_date: addDate || null,
        description: addDesc.trim(),
        transport_amount: transport,
        bill_amount: bill,
        sort_order: trips.length,
      })
      setTrips(prev => [...prev, {
        id, trip_date: addDate || null, description: addDesc.trim(),
        transport_amount: transport, bill_amount: bill, sort_order: trips.length,
      }])
      setAddDesc('')
      setAddTransport(String(DEFAULT_TRANSPORT))
      setAddBill('')
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to add trip')
    } finally {
      setAddSaving(false)
    }
  }

  function startEdit(trip: Trip) {
    setEditId(trip.id)
    setEditDate(trip.trip_date ?? '')
    setEditDesc(trip.description)
    setEditTransport(String(trip.transport_amount))
    setEditBill(trip.bill_amount > 0 ? String(trip.bill_amount) : '')
  }

  async function saveEdit(id: string) {
    const transport = parseFloat(editTransport) || 0
    const bill = parseFloat(editBill) || 0
    setEditSaving(true)
    try {
      await updateDriverPayoutTrip(id, payout.id, {
        trip_date: editDate || null,
        description: editDesc.trim(),
        transport_amount: transport,
        bill_amount: bill,
      })
      setTrips(prev => prev.map(t => t.id === id
        ? { ...t, trip_date: editDate || null, description: editDesc.trim(), transport_amount: transport, bill_amount: bill }
        : t
      ))
      setEditId(null)
    } finally {
      setEditSaving(false)
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      await deleteDriverPayoutTrip(id, payout.id)
      setTrips(prev => prev.filter(t => t.id !== id))
    } finally {
      setDeletingId(null)
    }
  }

  async function handleFinalize() {
    setFinalizing(true)
    try {
      await updateDriverPayout(payout.id, { finalized: !payout.finalized })
      router.refresh()
    } finally {
      setFinalizing(false)
    }
  }

  async function copyAsImage() {
    if (!printRef.current) return
    setCopying(true)
    try {
      const { toPng } = await import('html-to-image')
      const dataUrl = await toPng(printRef.current, {
        backgroundColor: '#ffffff',
        pixelRatio: 2,
        filter: (node) => !(node as Element).classList?.contains('no-screenshot'),
      })
      const res = await fetch(dataUrl)
      const blob = await res.blob()
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    } catch (err) {
      console.error(err)
      alert('Could not copy image. Your browser may not support this feature.')
    } finally {
      setCopying(false)
    }
  }

  const editable = !payout.finalized

  const sortIcon = sortDir === 'asc'
    ? <ChevronUp className="w-3 h-3 inline-block ml-0.5" />
    : sortDir === 'desc'
    ? <ChevronDown className="w-3 h-3 inline-block ml-0.5" />
    : <ArrowUpDown className="w-3 h-3 inline-block ml-0.5 opacity-40" />

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Inject style to hide controls when preview is on */}
      {preview && <style>{'.no-screenshot { display: none !important; }'}</style>}

      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/driver-payouts">
            <button className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          </Link>
          <span className="text-gray-300">|</span>
          <span className="text-sm font-medium text-gray-700">{driverName}</span>
          {payout.finalized ? (
            <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
              <CheckCircle2 className="w-3 h-3" /> Finalized
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
              <Clock className="w-3 h-3" /> Draft
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPreview(v => !v)}>
            {preview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {preview ? 'Exit Preview' : 'Preview'}
          </Button>
          {editable && (
            <Button variant="outline" size="sm" onClick={handleFinalize} disabled={finalizing}>
              Mark as Finalized
            </Button>
          )}
          {!editable && (
            <Button variant="outline" size="sm" onClick={handleFinalize} disabled={finalizing}>
              Unfinalize
            </Button>
          )}
          <Button size="sm" onClick={copyAsImage} disabled={copying}>
            <Camera className="w-4 h-4" />
            {copying ? 'Capturing…' : copied ? '✓ Copied!' : 'Copy as Image'}
          </Button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <div ref={printRef} className="bg-white shadow-sm" style={{ fontFamily: 'system-ui, sans-serif' }}>

          {/* Header */}
          <div className="px-6 py-4 border-b-2 border-gray-800 flex items-start justify-between">
            <div>
              <p className="font-bold text-gray-900 text-base">{driverName}</p>
              <p className="text-sm text-gray-500">{period}</p>
            </div>
            <p className="text-sm text-gray-600 font-semibold">TRANSPORT PAYOUT</p>
          </div>

          {/* Table */}
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-300 bg-gray-50">
                <th className="text-left px-4 py-2 font-semibold text-gray-700 w-28">
                  <button
                    type="button"
                    onClick={cycleSort}
                    className="no-screenshot flex items-center gap-0.5 hover:text-gray-900 transition-colors"
                    title="Sort by date"
                  >
                    Date {sortIcon}
                  </button>
                  <span className="hidden no-screenshot:inline">Date</span>
                </th>
                <th className="text-left px-4 py-2 font-semibold text-gray-700">Description</th>
                <th className="text-right px-4 py-2 font-semibold text-gray-700 w-24">Transport</th>
                <th className="text-right px-4 py-2 font-semibold text-gray-700 w-24">Bill</th>
                {editable && <th className="no-screenshot w-10" />}
              </tr>
            </thead>

            <tbody>
              {sortedTrips.length === 0 && !showAdd && (
                <tr>
                  <td colSpan={editable ? 5 : 4} className="px-4 py-4 text-center text-xs text-gray-400 italic">
                    No trips yet
                  </td>
                </tr>
              )}

              {sortedTrips.map(trip => (
                editId === trip.id ? (
                  /* Inline edit row */
                  <tr key={trip.id} className="no-screenshot border-b border-yellow-200 bg-yellow-50">
                    <td className="px-2 py-1.5">
                      <Input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} className="h-7 text-xs w-28" />
                    </td>
                    <td className="px-2 py-1.5">
                      <Input
                        list="trip-desc-list-edit"
                        value={editDesc}
                        onChange={e => setEditDesc(e.target.value)}
                        className="h-7 text-xs"
                        autoFocus
                      />
                      <datalist id="trip-desc-list-edit">
                        {knownDescriptions.map(d => <option key={d} value={d} />)}
                      </datalist>
                    </td>
                    <td className="px-2 py-1.5">
                      <Input type="number" min="0" step="0.01" value={editTransport} onChange={e => setEditTransport(e.target.value)} className="h-7 text-xs w-20 ml-auto" />
                    </td>
                    <td className="px-2 py-1.5">
                      <Input type="number" min="0" step="0.01" value={editBill} onChange={e => setEditBill(e.target.value)} placeholder="0.00" className="h-7 text-xs w-20 ml-auto" />
                    </td>
                    <td className="no-screenshot px-2 py-1.5">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => saveEdit(trip.id)}
                          disabled={editSaving}
                          className="flex items-center justify-center w-6 h-6 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                          title="Save"
                        >
                          {editSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                        </button>
                        <button
                          onClick={() => setEditId(null)}
                          className="flex items-center justify-center w-6 h-6 rounded border border-gray-200 text-gray-500 hover:bg-gray-100"
                          title="Cancel"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  /* Display row — click description to edit */
                  <tr key={trip.id} className="border-b border-gray-100 group">
                    <td className="px-4 py-2 text-gray-500 text-xs">{trip.trip_date ? fmtDate(trip.trip_date) : ''}</td>
                    <td
                      className={`px-4 py-2 text-gray-900 ${editable ? 'cursor-pointer hover:text-blue-600 hover:underline' : ''}`}
                      onClick={editable ? () => startEdit(trip) : undefined}
                      title={editable ? 'Click to edit' : undefined}
                    >
                      {trip.description}
                    </td>
                    <td className="px-4 py-2 text-right text-gray-900">{trip.transport_amount > 0 ? fmtRM(trip.transport_amount) : ''}</td>
                    <td className="px-4 py-2 text-right text-gray-900">{trip.bill_amount > 0 ? fmtRM(trip.bill_amount) : ''}</td>
                    {editable && (
                      <td className="no-screenshot px-2 py-1.5">
                        <button
                          onClick={() => handleDelete(trip.id)}
                          disabled={deletingId === trip.id}
                          className="flex items-center justify-center w-6 h-6 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 disabled:opacity-40 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </td>
                    )}
                  </tr>
                )
              ))}

              {/* Add trip button row */}
              {editable && !showAdd && (
                <tr className="no-screenshot border-b border-gray-100">
                  <td colSpan={5} className="px-4 py-2">
                    <button
                      onClick={() => setShowAdd(true)}
                      className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Trip
                    </button>
                  </td>
                </tr>
              )}

              {/* Add trip form row */}
              {editable && showAdd && (
                <tr className="no-screenshot bg-blue-50 border-b border-blue-100">
                  <td colSpan={5} className="px-3 py-3">
                    <form onSubmit={handleAddTrip}>
                      <div className="flex items-end gap-2 flex-wrap">
                        <div className="flex flex-col gap-0.5">
                          <label className="text-xs font-medium text-gray-600">Date</label>
                          <div className="flex items-center gap-1">
                            <div className="flex flex-col rounded-md border border-gray-300 overflow-hidden flex-shrink-0">
                              <button type="button" onClick={() => shiftAddDate(+1)}
                                className="flex items-center justify-center w-6 h-4 text-gray-500 hover:text-gray-900 hover:bg-gray-100 border-b border-gray-300 transition-colors"
                                title="Next day">
                                <ChevronUp className="w-3 h-3" />
                              </button>
                              <button type="button" onClick={() => shiftAddDate(-1)}
                                className="flex items-center justify-center w-6 h-4 text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                                title="Previous day">
                                <ChevronDown className="w-3 h-3" />
                              </button>
                            </div>
                            <Input type="date" value={addDate} onChange={e => setAddDate(e.target.value)} className="h-8 text-sm w-36" />
                          </div>
                        </div>
                        <div className="flex flex-col gap-0.5 flex-1 min-w-32">
                          <label className="text-xs font-medium text-gray-600">Description *</label>
                          <Input
                            list="trip-desc-list"
                            value={addDesc}
                            onChange={e => setAddDesc(e.target.value)}
                            placeholder="e.g. Hospital visit"
                            className="h-8 text-sm"
                            autoFocus
                          />
                          <datalist id="trip-desc-list">
                            {knownDescriptions.map(d => <option key={d} value={d} />)}
                          </datalist>
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <label className="text-xs font-medium text-gray-600">Transport</label>
                          <Input type="number" min="0" step="0.01" value={addTransport} onChange={e => setAddTransport(e.target.value)} className="h-8 text-sm w-24" />
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <label className="text-xs font-medium text-gray-600">Bill</label>
                          <Input type="number" min="0" step="0.01" value={addBill} onChange={e => setAddBill(e.target.value)} placeholder="0.00" className="h-8 text-sm w-24" />
                        </div>
                        <div className="flex items-end gap-1.5 pb-0.5">
                          <button type="submit" disabled={addSaving}
                            className="flex items-center justify-center w-8 h-8 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                            title="Add trip">
                            {addSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                          </button>
                          <button type="button" onClick={() => { setShowAdd(false); setAddError('') }}
                            className="flex items-center justify-center w-8 h-8 rounded-md border border-gray-200 text-gray-500 hover:bg-gray-100"
                            title="Cancel">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      {addError && <p className="mt-1.5 text-xs text-red-600">{addError}</p>}
                    </form>
                  </td>
                </tr>
              )}
            </tbody>

            <tfoot>
              <tr className="border-t border-gray-200 bg-gray-50">
                <td colSpan={2} className="px-4 py-2 text-xs text-gray-500 font-medium">Subtotal</td>
                <td className="px-4 py-2 text-right text-gray-700 font-medium">{fmtRM(transportTotal)}</td>
                <td className="px-4 py-2 text-right text-gray-700 font-medium">{billTotal > 0 ? fmtRM(billTotal) : ''}</td>
                {editable && <td className="no-screenshot" />}
              </tr>
              <tr className="border-t-2 border-gray-800 bg-gray-50">
                <td colSpan={3} className="px-4 py-3 font-bold text-gray-900">TOTAL</td>
                <td className="px-4 py-3 text-right font-bold text-gray-900 text-base">RM {fmtRM(grandTotal)}</td>
                {editable && <td className="no-screenshot" />}
              </tr>
            </tfoot>
          </table>

          {payout.finalized && (
            <div className="no-screenshot flex items-center gap-2 px-5 py-3 border-t border-green-100 bg-green-50 text-sm text-green-700">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              Finalized — click "Unfinalize" in the toolbar to make changes.
            </div>
          )}
        </div>
      </div>

      {copied && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-sm px-4 py-2.5 rounded-full shadow-lg">
          Image copied — paste into WhatsApp
        </div>
      )}
    </div>
  )
}
