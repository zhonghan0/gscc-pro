'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, CheckCircle, AlertCircle, Loader2, ChevronDown, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { parseCSVStatement, saveBatchPayments } from '@/actions/payments'
import type { ParsedTransaction } from '@/actions/payments'
import type { Resident } from '@/lib/types'

// Searchable resident combobox
function ResidentCombobox({
  residents,
  value,
  onChange,
  disabled,
}: {
  residents: Pick<Resident, 'id' | 'full_name'>[]
  value: string
  onChange: (id: string) => void
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState<number>(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const selected = residents.find(r => r.id === value)

  const filtered = query.trim()
    ? residents.filter(r => r.full_name.toLowerCase().includes(query.toLowerCase()))
    : residents

  // options[0] = Unassigned (''), options[1..] = filtered residents
  const options: Array<{ id: string; label: string }> = [
    { id: '', label: '— Unassigned —' },
    ...filtered.map(r => ({ id: r.id, label: r.full_name })),
  ]

  // Close on outside click
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
        setActiveIndex(-1)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  // Reset active index when filter changes
  useEffect(() => {
    setActiveIndex(-1)
  }, [query])

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex < 0 || !listRef.current) return
    const item = listRef.current.querySelectorAll('li')[activeIndex]
    item?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  function handleOpen() {
    if (disabled) return
    setOpen(true)
    setQuery('')
    setActiveIndex(-1)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  function handleSelect(id: string) {
    onChange(id)
    setOpen(false)
    setQuery('')
    setActiveIndex(-1)
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation()
    onChange('')
    setOpen(false)
    setQuery('')
    setActiveIndex(-1)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(i => Math.min(i + 1, options.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (activeIndex >= 0 && activeIndex < options.length) {
        handleSelect(options[activeIndex].id)
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
      setQuery('')
      setActiveIndex(-1)
    }
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={handleOpen}
        disabled={disabled}
        className={`w-full flex items-center justify-between px-2 py-1 text-xs border rounded-md bg-white text-left transition-colors
          ${disabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200' : 'border-gray-300 hover:border-blue-400 focus:outline-none'}
          ${!selected ? 'text-gray-400' : 'text-gray-900'}`}
      >
        <span className="truncate">{selected ? selected.full_name : '— select resident —'}</span>
        <span className="flex items-center gap-0.5 ml-1 flex-shrink-0">
          {selected && !disabled && (
            <span onClick={handleClear} className="p-0.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600">
              <X className="w-3 h-3" />
            </span>
          )}
          <ChevronDown className="w-3 h-3 text-gray-400" />
        </span>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          <div className="p-1.5 border-b border-gray-100">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type to search…"
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <ul ref={listRef} className="max-h-48 overflow-y-auto py-1">
            {options.map((opt, idx) => (
              <li key={opt.id === '' ? '__unassigned__' : opt.id}>
                <button
                  type="button"
                  onClick={() => handleSelect(opt.id)}
                  onMouseEnter={() => setActiveIndex(idx)}
                  className={`w-full text-left px-3 py-1.5 text-xs transition-colors
                    ${idx === activeIndex
                      ? 'bg-blue-100 text-blue-800'
                      : opt.id === value
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : opt.id === ''
                          ? 'text-gray-400 hover:bg-gray-50'
                          : 'text-gray-800 hover:bg-blue-50 hover:text-blue-700'
                    }`}
                >
                  {opt.label}
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-xs text-gray-400">No match</li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}

interface Props {
  residents: Pick<Resident, 'id' | 'full_name'>[]
}

function formatAmount(amount: number): string {
  return `RM ${amount.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

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

interface RowState {
  included: boolean
  residentId: string
  status: 'new' | 'auto_matched' | 'already_imported'
}

export function StatementImporter({ residents }: Props) {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [parsing, startParsing] = useTransition()
  const [saving, startSaving] = useTransition()

  const [transactions, setTransactions] = useState<ParsedTransaction[]>([])
  const [rowStates, setRowStates] = useState<RowState[]>([])
  const [bankImportId, setBankImportId] = useState('')
  const [parseError, setParseError] = useState('')
  const [saveResult, setSaveResult] = useState<{ success: boolean; count: number } | null>(null)
  const [step, setStep] = useState<'upload' | 'review'>('upload')

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null
    setFile(f)
    setParseError('')
    setSaveResult(null)
  }

  function handleParse() {
    if (!file) return
    setParseError('')

    const formData = new FormData()
    formData.append('file', file)

    startParsing(async () => {
      try {
        const result = await parseCSVStatement(formData)
        setTransactions(result.transactions)
        setBankImportId(result.bankImportId)

        const states: RowState[] = result.transactions.map(txn => {
          const alreadyImported = result.existingTxnKeys.includes(txn.txnKey)
          const mappedResidentId = result.payerMappings[txn.payerName.toUpperCase()] ?? ''
          const status: RowState['status'] = alreadyImported
            ? 'already_imported'
            : mappedResidentId
            ? 'auto_matched'
            : 'new'

          return {
            included: !alreadyImported,
            residentId: mappedResidentId,
            status,
          }
        })

        setRowStates(states)
        setStep('review')
      } catch (err: unknown) {
        setParseError(err instanceof Error ? err.message : 'Failed to parse statement')
      }
    })
  }

  function toggleIncluded(idx: number) {
    setRowStates(prev => prev.map((r, i) => i === idx ? { ...r, included: !r.included } : r))
  }

  function setResident(idx: number, residentId: string) {
    setRowStates(prev => prev.map((r, i) => {
      if (i !== idx) return r
      const newStatus = r.status === 'already_imported'
        ? 'already_imported'
        : residentId
        ? 'auto_matched'
        : 'new'
      return { ...r, residentId, status: newStatus }
    }))
  }

  function handleSave() {
    const checkedRows = transactions
      .map((txn, i) => ({ txn, state: rowStates[i] }))
      .filter(({ state }) => state.included && state.status !== 'already_imported' && !!state.residentId)

    const paymentRows = checkedRows.map(({ txn, state }) => ({
      resident_id: state.residentId || null,
      payment_date: txn.date,
      amount: txn.amount,
      payment_method: txn.paymentMethod,
      payer_name: txn.payerName || null,
      reference: txn.reference || null,
      description: txn.description || null,
      txn_key: txn.txnKey,
      bank_import_id: bankImportId,
    }))

    const mappingRows: Array<{ payer_key: string; resident_id: string }> = []
    for (const { txn, state } of checkedRows) {
      if (state.residentId) {
        mappingRows.push({
          payer_key: txn.payerName.toUpperCase(),
          resident_id: state.residentId,
        })
      }
    }

    startSaving(async () => {
      try {
        await saveBatchPayments(paymentRows, mappingRows)
        setSaveResult({ success: true, count: paymentRows.length })
      } catch (err: unknown) {
        setSaveResult({ success: false, count: 0 })
        console.error(err)
      }
    })
  }

  const includedCount = rowStates.filter(r => r.included && r.status !== 'already_imported' && !!r.residentId).length
  const autoMatchedCount = rowStates.filter(r => r.status === 'auto_matched').length
  const alreadyImportedCount = rowStates.filter(r => r.status === 'already_imported').length
  const newCount = rowStates.filter(r => r.status === 'new').length
  const skippedNoResident = rowStates.filter(r => r.included && r.status !== 'already_imported' && !r.residentId).length
  const totalAmount = transactions
    .filter((_, i) => rowStates[i]?.included && rowStates[i]?.status !== 'already_imported' && !!rowStates[i]?.residentId)
    .reduce((sum, t) => sum + t.amount, 0)

  if (saveResult?.success) {
    return (
      <div className="max-w-2xl mx-auto bg-white rounded-xl border border-gray-200 p-10 text-center space-y-4">
        <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
        <h2 className="text-lg font-semibold text-gray-900">Import successful</h2>
        <p className="text-gray-600">{saveResult.count} payment{saveResult.count !== 1 ? 's' : ''} saved.</p>
        <Button onClick={() => router.push('/payments')}>View Payments</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {step === 'upload' && (
        <div className="max-w-lg mx-auto bg-white rounded-xl border border-gray-200 p-8 space-y-6">
          <div className="text-center space-y-2">
            <Upload className="w-10 h-10 text-blue-500 mx-auto" />
            <h2 className="text-base font-semibold text-gray-900">Upload OCBC Bank Statement</h2>
            <p className="text-sm text-gray-500">Download <strong>e-Statement CSV (with header)</strong> from OCBC and upload here.</p>
          </div>

          <div>
            <label htmlFor="csv-upload" className="block text-sm font-medium text-gray-700 mb-1">
              CSV File
            </label>
            <input
              id="csv-upload"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
            />
          </div>

          {parseError && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{parseError}</span>
            </div>
          )}

          <Button
            onClick={handleParse}
            disabled={!file || parsing}
            className="w-full"
          >
            {parsing ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Parsing…</>
            ) : (
              'Parse Statement'
            )}
          </Button>
        </div>
      )}

      {step === 'review' && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700">{newCount} new</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">{autoMatchedCount} auto-matched</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700">{alreadyImportedCount} already imported</span>
            </div>
            <div className="ml-auto flex items-center gap-3">
              {skippedNoResident > 0 && (
                <span className="text-xs text-gray-400">{skippedNoResident} skipped (no resident)</span>
              )}
              <span className="font-semibold text-green-700">{includedCount} to save · {formatAmount(totalAmount)}</span>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-3 py-3 w-8" />
                    <th className="text-left px-3 py-3 font-medium text-gray-600 whitespace-nowrap">Date</th>
                    <th className="text-left px-3 py-3 font-medium text-gray-600 min-w-[160px]">Payer Name</th>
                    <th className="text-right px-3 py-3 font-medium text-gray-600 whitespace-nowrap">Amount</th>
                    <th className="text-left px-3 py-3 font-medium text-gray-600">Method</th>
                    <th className="text-left px-3 py-3 font-medium text-gray-600 min-w-[160px]">Ref / Desc</th>
                    <th className="text-left px-3 py-3 font-medium text-gray-600 min-w-[180px]">Resident</th>
                    <th className="text-left px-3 py-3 font-medium text-gray-600">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {transactions.map((txn, i) => {
                    const state = rowStates[i]
                    if (!state) return null
                    const isAlreadyImported = state.status === 'already_imported'

                    return (
                      <tr
                        key={txn.txnKey}
                        className={`transition-colors ${isAlreadyImported ? 'opacity-50 bg-gray-50' : state.included ? 'hover:bg-gray-50' : 'bg-gray-50 opacity-60'}`}
                      >
                        <td className="px-3 py-3">
                          <input
                            type="checkbox"
                            checked={state.included && !isAlreadyImported}
                            disabled={isAlreadyImported}
                            onChange={() => toggleIncluded(i)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-3 py-3 text-gray-600 whitespace-nowrap text-xs">{txn.date}</td>
                        <td className="px-3 py-3 text-gray-700 max-w-[160px] truncate" title={txn.payerName}>
                          {txn.payerName}
                        </td>
                        <td className="px-3 py-3 text-right font-medium text-green-700 whitespace-nowrap">
                          {formatAmount(txn.amount)}
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-500">
                          {METHOD_LABELS[txn.paymentMethod] ?? txn.paymentMethod}
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-500 max-w-[160px]">
                          <div className="truncate" title={txn.reference}>{txn.reference || '—'}</div>
                          {txn.description && (
                            <div className="truncate text-gray-400" title={txn.description}>{txn.description}</div>
                          )}
                        </td>
                        <td className="px-3 py-3 min-w-[180px]">
                          <ResidentCombobox
                            residents={residents}
                            value={state.residentId}
                            onChange={id => setResident(i, id)}
                            disabled={isAlreadyImported}
                          />
                        </td>
                        <td className="px-3 py-3">
                          {state.status === 'already_imported' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700">Already imported</span>
                          )}
                          {state.status === 'auto_matched' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">Auto-matched</span>
                          )}
                          {state.status === 'new' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700">New</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => { setStep('upload'); setTransactions([]); setRowStates([]) }}
            >
              Back
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || includedCount === 0}
            >
              {saving ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…</>
              ) : (
                `Save ${includedCount} Payment${includedCount !== 1 ? 's' : ''}`
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
