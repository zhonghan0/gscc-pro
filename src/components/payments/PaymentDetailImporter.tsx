'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Upload, Download, CheckCircle, AlertCircle } from 'lucide-react'
import { importPaymentsDetail } from '@/actions/import-payments-detail'

interface PreviewRow {
  resident: string
  forMonth: string
  paymentDate: string
  amount: string
  method: string
  payerName: string
  reference: string
  description: string
  notes: string
  status: 'ok' | 'warn' | 'skip'
  message?: string
}

const METHOD_VALUES: Record<string, string> = {
  duitnow: 'DuitNow',
  giro: 'Giro/IBG',
  cash: 'Cash',
  cheque: 'Cheque',
  fpx: 'FPX',
  meps: 'Instant Transfer (MEPS)',
  online_banking: 'Online Banking',
  other: 'Other',
}

function downloadTemplate() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const XLSX = require('xlsx') as typeof import('xlsx')
  const headers = [
    'Resident', 'For Month', 'Payment Date', 'Amount (RM)',
    'Method', 'Payer Name', 'Reference', 'Description', 'Notes',
  ]
  const note = [
    'e.g. Ahmad bin Ali', 'YYYY-MM e.g. 2026-05', 'DD/MM/YYYY e.g. 15/05/2026',
    'e.g. 1500', Object.values(METHOD_VALUES).join(' / '), '', '', '', '',
  ]
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet([headers, note])
  ws['!cols'] = [
    { wch: 24 }, { wch: 12 }, { wch: 16 }, { wch: 12 },
    { wch: 22 }, { wch: 22 }, { wch: 20 }, { wch: 24 }, { wch: 28 },
  ]
  XLSX.utils.book_append_sheet(wb, ws, 'Payments Detail')
  XLSX.writeFile(wb, 'Payments_Detail_Template.xlsx')
}

export function PaymentDetailImporter() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<PreviewRow[] | null>(null)
  const [fileName, setFileName] = useState('')
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null)

  function parseMethod(raw: string): string {
    const s = raw.trim().toLowerCase()
    if (s.includes('duitnow')) return 'duitnow'
    if (s.includes('giro') || s.includes('ibg')) return 'giro'
    if (s === 'cash') return 'cash'
    if (s.includes('cheque')) return 'cheque'
    if (s === 'fpx') return 'fpx'
    if (s.includes('meps') || s.includes('instant')) return 'meps'
    if (s.includes('online') || s.includes('banking')) return 'online_banking'
    return 'other'
  }

  function parseDateCell(val: unknown): string {
    if (!val) return ''
    const s = String(val).trim()
    // DD/MM/YYYY
    const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
    if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`
    // YYYY-MM-DD
    const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (iso) return s
    return ''
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setResult(null)

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const XLSX = require('xlsx') as typeof import('xlsx')
    const buf = await file.arrayBuffer()
    const wb = XLSX.read(buf, { type: 'buffer', cellDates: false })
    const sheet = wb.Sheets[wb.SheetNames[0]]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })

    const dataRows = rows.slice(1).filter(r => r.some(c => c !== ''))
    const parsed: PreviewRow[] = dataRows.map(r => {
      const resident = String(r[0] ?? '').trim()
      const forMonth = String(r[1] ?? '').trim()
      const paymentDate = parseDateCell(r[2])
      const amount = parseFloat(String(r[3] ?? '')) || 0
      const method = parseMethod(String(r[4] ?? ''))
      const payerName = String(r[5] ?? '').trim()
      const reference = String(r[6] ?? '').trim()
      const description = String(r[7] ?? '').trim()
      const notes = String(r[8] ?? '').trim()

      let status: PreviewRow['status'] = 'ok'
      let message: string | undefined

      if (!resident) { status = 'skip'; message = 'Missing resident name' }
      else if (!forMonth || !/^\d{4}-\d{2}$/.test(forMonth)) { status = 'warn'; message = 'Invalid For Month (use YYYY-MM)' }
      else if (!paymentDate) { status = 'warn'; message = 'Invalid payment date (use DD/MM/YYYY)' }
      else if (amount <= 0) { status = 'warn'; message = 'Invalid amount' }

      return {
        resident,
        forMonth,
        paymentDate,
        amount: amount > 0 ? amount.toFixed(2) : '',
        method: METHOD_VALUES[method] ?? method,
        payerName,
        reference,
        description,
        notes,
        status,
        message,
      }
    })

    setPreview(parsed)
  }

  async function handleImport() {
    if (!preview || !fileRef.current?.files?.[0]) return
    setImporting(true)
    try {
      const fd = new FormData()
      fd.append('file', fileRef.current.files[0])
      const res = await importPaymentsDetail(fd)
      setResult(res)
      setPreview(null)
    } catch (err) {
      setResult({ imported: 0, skipped: 0, errors: [err instanceof Error ? err.message : 'Unknown error'] })
    } finally {
      setImporting(false)
    }
  }

  function reset() {
    setPreview(null)
    setResult(null)
    setFileName('')
    if (fileRef.current) fileRef.current.value = ''
  }

  const okCount = preview?.filter(r => r.status === 'ok').length ?? 0
  const warnCount = preview?.filter(r => r.status === 'warn').length ?? 0
  const skipCount = preview?.filter(r => r.status === 'skip').length ?? 0

  return (
    <div className="space-y-5">
      {/* Template download */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Import individual payment records with full details — resident, month, date, amount, method, reference and notes.
        </p>
        <Button variant="outline" size="sm" onClick={downloadTemplate}>
          <Download className="w-4 h-4" /> Download Template
        </Button>
      </div>

      {/* File picker */}
      {!preview && !result && (
        <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-gray-300 rounded-xl p-8 cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-colors">
          <Upload className="w-8 h-8 text-gray-400" />
          <div className="text-center">
            <p className="text-sm font-medium text-gray-700">Click to upload Excel file</p>
            <p className="text-xs text-gray-400 mt-1">.xlsx only</p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx"
            className="hidden"
            onChange={handleFile}
          />
        </label>
      )}

      {/* Preview */}
      {preview && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-xs text-gray-600">
              <span className="font-medium text-gray-800">{fileName}</span>
              <span className="text-green-700">{okCount} ready</span>
              {warnCount > 0 && <span className="text-amber-600">{warnCount} warnings</span>}
              {skipCount > 0 && <span className="text-red-600">{skipCount} skipped</span>}
            </div>
            <button onClick={reset} className="text-xs text-gray-400 hover:text-gray-600">Clear</button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Resident', 'For Month', 'Payment Date', 'Amount', 'Method', 'Payer Name', 'Reference'].map(h => (
                    <th key={h} className="px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap">{h}</th>
                  ))}
                  <th className="px-3 py-2 text-left font-medium text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {preview.map((row, i) => (
                  <tr key={i} className={row.status === 'skip' ? 'bg-red-50' : row.status === 'warn' ? 'bg-amber-50' : ''}>
                    <td className="px-3 py-2 font-medium text-gray-900">{row.resident || <span className="text-red-400">—</span>}</td>
                    <td className="px-3 py-2 text-gray-700">{row.forMonth || '—'}</td>
                    <td className="px-3 py-2 text-gray-700">{row.paymentDate || '—'}</td>
                    <td className="px-3 py-2 text-gray-700">{row.amount ? `RM ${row.amount}` : '—'}</td>
                    <td className="px-3 py-2 text-gray-700">{row.method}</td>
                    <td className="px-3 py-2 text-gray-700">{row.payerName || '—'}</td>
                    <td className="px-3 py-2 text-gray-700">{row.reference || '—'}</td>
                    <td className="px-3 py-2">
                      {row.status === 'ok'
                        ? <span className="text-green-600">✓ Ready</span>
                        : row.status === 'warn'
                        ? <span className="text-amber-600" title={row.message}>⚠ {row.message}</span>
                        : <span className="text-red-500" title={row.message}>✕ {row.message}</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={handleImport} disabled={importing || okCount === 0}>
              {importing ? 'Importing…' : `Import ${okCount} Payment${okCount !== 1 ? 's' : ''}`}
            </Button>
            <Button variant="outline" onClick={reset}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="space-y-3">
          {result.imported > 0 && (
            <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm">
              <CheckCircle className="w-4 h-4" />
              Successfully imported {result.imported} payment{result.imported !== 1 ? 's' : ''}.
              {result.skipped > 0 && ` (${result.skipped} skipped — already exist)`}
            </div>
          )}
          {result.errors.map((e, i) => (
            <div key={i} className="flex items-start gap-2 text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              {e}
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={reset}>Import another file</Button>
        </div>
      )}
    </div>
  )
}
