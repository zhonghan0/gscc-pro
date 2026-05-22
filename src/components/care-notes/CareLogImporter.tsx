'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Upload, Download, CheckCircle, AlertCircle } from 'lucide-react'
import { importCareLogs } from '@/actions/import-care-logs'

interface PreviewRow {
  resident: string
  date: string
  note: string
  status: 'ok' | 'warn' | 'skip'
  message?: string
}

function parseDateTimeCell(val: unknown): string {
  if (!val) return ''
  const s = String(val).trim()
  const full = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})$/)
  if (full) return s
  const date = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (date) return s
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s
  return ''
}

function downloadTemplate() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const XLSX = require('xlsx') as typeof import('xlsx')
  const headers = ['Resident', 'Date', 'Author', 'Note']
  const note    = ['e.g. Ahmad bin Ali', 'DD/MM/YYYY HH:MM e.g. 15/05/2026 09:30', '(ignored on import)', 'Care note text here…']
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet([headers, note])
  ws['!cols'] = [{ wch: 24 }, { wch: 22 }, { wch: 22 }, { wch: 60 }]
  XLSX.utils.book_append_sheet(wb, ws, 'Care Logs')
  XLSX.writeFile(wb, 'CareLogs_Template.xlsx')
}

export function CareLogImporter() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<PreviewRow[] | null>(null)
  const [fileName, setFileName] = useState('')
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null)

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

    const dataRows = rows.slice(1).filter((r: unknown[]) => r.some(c => c !== ''))
    const parsed: PreviewRow[] = dataRows.map(r => {
      const resident = String(r[0] ?? '').trim()
      const date     = parseDateTimeCell(r[1])
      // r[2] = Author — ignored
      const note     = String(r[3] ?? '').trim()

      let status: PreviewRow['status'] = 'ok'
      let message: string | undefined

      if (!resident)   { status = 'skip'; message = 'Missing resident' }
      else if (!date)  { status = 'warn'; message = 'Invalid date (use DD/MM/YYYY HH:MM)' }
      else if (!note)  { status = 'skip'; message = 'Empty note — will be skipped' }

      return { resident, date, note: note.length > 80 ? note.slice(0, 80) + '…' : note, status, message }
    })

    setPreview(parsed)
  }

  async function handleImport() {
    if (!preview || !fileRef.current?.files?.[0]) return
    setImporting(true)
    try {
      const fd = new FormData()
      fd.append('file', fileRef.current.files[0])
      const res = await importCareLogs(fd)
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

  const okCount   = preview?.filter(r => r.status === 'ok').length   ?? 0
  const warnCount = preview?.filter(r => r.status === 'warn').length  ?? 0
  const skipCount = preview?.filter(r => r.status === 'skip').length  ?? 0

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Import care log entries with resident, date/time and note text. The Author column is ignored — imported notes are attributed to your account.
        </p>
        <Button variant="outline" size="sm" onClick={downloadTemplate}>
          <Download className="w-4 h-4" /> Download Template
        </Button>
      </div>

      {!preview && !result && (
        <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-gray-300 rounded-xl p-8 cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-colors">
          <Upload className="w-8 h-8 text-gray-400" />
          <div className="text-center">
            <p className="text-sm font-medium text-gray-700">Click to upload Excel file</p>
            <p className="text-xs text-gray-400 mt-1">.xlsx only</p>
          </div>
          <input ref={fileRef} type="file" accept=".xlsx" className="hidden" onChange={handleFile} />
        </label>
      )}

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

          <div className="overflow-x-auto rounded-xl border border-gray-200 max-h-96">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                <tr>
                  {['Resident', 'Date', 'Note (preview)', 'Status'].map(h => (
                    <th key={h} className="px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {preview.map((row, i) => (
                  <tr key={i} className={row.status === 'skip' ? 'bg-red-50' : row.status === 'warn' ? 'bg-amber-50' : ''}>
                    <td className="px-3 py-2 font-medium text-gray-900 whitespace-nowrap">{row.resident || <span className="text-red-400">—</span>}</td>
                    <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{row.date || '—'}</td>
                    <td className="px-3 py-2 text-gray-600 max-w-xs">{row.note || <span className="text-gray-300">—</span>}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {row.status === 'ok'
                        ? <span className="text-green-600">✓ Ready</span>
                        : row.status === 'warn'
                        ? <span className="text-amber-600">⚠ {row.message}</span>
                        : <span className="text-red-500">✕ {row.message}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={handleImport} disabled={importing || okCount === 0}>
              {importing ? 'Importing…' : `Import ${okCount} Log${okCount !== 1 ? 's' : ''}`}
            </Button>
            <Button variant="outline" onClick={reset}>Cancel</Button>
          </div>
        </div>
      )}

      {result && (
        <div className="space-y-3">
          {result.imported > 0 && (
            <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm">
              <CheckCircle className="w-4 h-4" />
              Successfully imported {result.imported} care log{result.imported !== 1 ? 's' : ''}.
              {result.skipped > 0 && ` (${result.skipped} skipped)`}
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
