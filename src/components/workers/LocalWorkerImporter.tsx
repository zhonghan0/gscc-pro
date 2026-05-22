'use client'

import { useState, useCallback } from 'react'
import * as XLSX from 'xlsx'
import { Button } from '@/components/ui/button'
import { parseNRIC, formatNRIC } from '@/lib/utils'
import { bulkImportLocalWorkers, type LocalWorkerImportRow, type LocalWorkerImportResult } from '@/actions/import-local-workers'
import { Upload, CheckCircle, XCircle, AlertCircle, FileSpreadsheet, Loader2, Download } from 'lucide-react'

type Position = { id: string; name: string }

// ── Template download ─────────────────────────────────────────
function downloadTemplate() {
  // Match the exact column names from the actual Excel file
  const headers = [
    'Name', 'Nickname', 'IC', 'Gender', 'DOB', 'Position', 'Contact No.',
    'Date Start Work', 'Date End Work', 'Address', 'Bank', 'Bank Account', 'Salary', 'KWSP', 'Remark',
  ]
  const example = [
    'Tan Ah Kow', 'Ah Kow', '850115-14-5678', 'M', '15-01-1985', 'Pengurus', '012-3456789',
    '01-03-2020', '', '123 Jalan Merdeka, KL', 'Maybank', '1234567890', '2500', '12345678', '',
  ]

  const ws = XLSX.utils.aoa_to_sheet([headers, example])
  ws['!cols'] = [
    { wch: 22 }, { wch: 14 }, { wch: 16 }, { wch: 8 }, { wch: 12 }, { wch: 16 }, { wch: 14 },
    { wch: 15 }, { wch: 15 }, { wch: 35 }, { wch: 14 }, { wch: 18 }, { wch: 10 }, { wch: 12 }, { wch: 20 },
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Local Workers')
  XLSX.writeFile(wb, 'local_workers_template.xlsx')
}

// ── Date parsing ──────────────────────────────────────────────
function parseDate(raw: unknown): string | null {
  if (raw == null || raw === '') return null
  if (typeof raw === 'number') {
    const date = XLSX.SSF.parse_date_code(raw)
    if (date) return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`
  }
  const str = raw.toString().trim()
  if (!str) return null
  // DD-MM-YYYY  (actual format in the Excel)
  const dashDMY = str.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/)
  if (dashDMY) return `${dashDMY[3]}-${dashDMY[2].padStart(2, '0')}-${dashDMY[1].padStart(2, '0')}`
  // DD/MM/YYYY
  const slashDMY = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (slashDMY) return `${slashDMY[3]}-${slashDMY[2].padStart(2, '0')}-${slashDMY[1].padStart(2, '0')}`
  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.substring(0, 10)
  const d = new Date(str)
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
  return null
}

/** Parse NRIC — handles "900216-01-6356" (with dashes) and raw digits */
function parseNRICField(raw: unknown): string | null {
  if (raw == null) return null
  const str = raw.toString().trim().replace(/\D/g, '')
  if (!str) return null
  return formatNRIC(str) || null
}

/** Parse gender — M/F or male/female */
function parseGender(raw: unknown): 'male' | 'female' | null {
  if (!raw) return null
  const v = raw.toString().trim().toLowerCase()
  if (v === 'm' || v === 'male') return 'male'
  if (v === 'f' || v === 'female') return 'female'
  return null
}

/**
 * Parse numeric-looking fields (bank account, KWSP) stored as Excel numbers.
 * Excel drops leading zeros when stored as numbers, so we read as-is and
 * convert to string. The DB stores these as text.
 */
function parseNumericText(raw: unknown): string | null {
  if (raw == null || raw === '') return null
  const str = raw.toString().trim()
  return str || null
}

function parseRow(row: Record<string, unknown>): LocalWorkerImportRow {
  const name = (row['Name'] ?? '').toString().trim()

  // IC column (Malaysian NRIC)
  const rawNric = parseNRICField(row['IC'] ?? row['NRIC'] ?? row['nric'])
  const parsedNric = rawNric ? parseNRIC(rawNric) : null

  // Gender: prefer explicit Gender column, fall back to NRIC-derived
  const explicitGender = parseGender(row['Gender'])
  const gender = explicitGender ?? parsedNric?.gender ?? null

  // DOB: prefer explicit DOB column, fall back to NRIC-derived
  const explicitDob = parseDate(row['DOB'] ?? row['Date of Birth'])
  const dob = explicitDob ?? parsedNric?.dob ?? null

  const rawSalary = row['Salary'] ?? null
  const salary = rawSalary != null && rawSalary !== ''
    ? parseFloat(rawSalary.toString())
    : null

  return {
    name,
    nric: rawNric,
    gender,
    date_of_birth: dob,
    contact_number: (row['Contact No.'] ?? row['Contact'] ?? '').toString().trim() || null,
    date_start_work: parseDate(row['Date Start Work'] ?? row['Start Date']),
    date_end_work: parseDate(row['Date End Work'] ?? row['End Date']),
    current_salary: salary != null && !isNaN(salary) ? salary : null,
    bank: (row['Bank'] ?? '').toString().trim() || null,
    // "Bank Account" is the actual column name in the Excel
    bank_account_number: parseNumericText(row['Bank Account'] ?? row['Account No.'] ?? row['Account']),
    kwsp: parseNumericText(row['KWSP'] ?? row['EPF']),
    position_name: (row['Position'] ?? '').toString().trim() || null,
    address: (row['Address'] ?? '').toString().trim() || null,
    remark: (row['Remark'] ?? '').toString().trim() || null,
    nickname: (row['Nickname'] ?? '').toString().trim() || null,
  }
}

// ── Duplicate NRIC detection ──────────────────────────────────
function findDuplicateNrics(rows: LocalWorkerImportRow[]): Set<string> {
  const seen = new Map<string, number>()
  const dupes = new Set<string>()
  rows.forEach(r => {
    if (!r.nric) return
    const key = r.nric.replace(/\D/g, '')
    seen.set(key, (seen.get(key) ?? 0) + 1)
    if ((seen.get(key) ?? 0) > 1) dupes.add(key)
  })
  return dupes
}

// ── Component ─────────────────────────────────────────────────
type Stage = 'idle' | 'preview' | 'importing' | 'done'

export function LocalWorkerImporter({ positions }: { positions: Position[] }) {
  const [stage, setStage] = useState<Stage>('idle')
  const [rows, setRows] = useState<LocalWorkerImportRow[]>([])
  const [result, setResult] = useState<LocalWorkerImportResult | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const processFile = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const data = new Uint8Array(e.target!.result as ArrayBuffer)
      const workbook = XLSX.read(data, { type: 'array', cellDates: false })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null })
      const parsed = raw
        .filter(r => (r['Name'] ?? '').toString().trim().length > 0)
        .map(parseRow)
      setRows(parsed)
      setStage('preview')
    }
    reader.readAsArrayBuffer(file)
  }, [])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    e.target.value = ''
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  const handleImport = async () => {
    setStage('importing')
    try {
      const res = await bulkImportLocalWorkers(rows)
      setResult(res)
      setStage('done')
    } catch (err) {
      setResult({ success: 0, failed: rows.length, errors: [{ row: 0, name: 'All rows', error: (err as Error).message }] })
      setStage('done')
    }
  }

  const reset = () => { setStage('idle'); setRows([]); setResult(null) }

  const positionNames = new Set(positions.map(p => p.name.toLowerCase()))

  // ── Idle ──────────────────────────────────────────────────
  if (stage === 'idle') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
          <div>
            <p className="text-sm font-medium text-gray-700">Need the correct format?</p>
            <p className="text-xs text-gray-500 mt-0.5">Download the template with the right headers and an example row.</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={downloadTemplate}>
            <Download className="w-4 h-4 mr-2" /> Download Template
          </Button>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-xs text-blue-700">
          {positions.length > 0
            ? <><span className="font-semibold">Existing positions:</span> {positions.map(p => p.name).join(' · ')} — </>
            : null}
          New positions found in the file will be <span className="font-semibold">created automatically</span>.
        </div>

        <div
          className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer ${
            dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <FileSpreadsheet className="w-12 h-12 mx-auto text-blue-600 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Drop your Excel file here</h3>
          <p className="text-sm text-gray-500 mb-1">
            Columns: <span className="font-mono text-xs">Name · IC · Gender · DOB · Position · Contact No. · Date Start Work · Date End Work · Address · Bank · Bank Account · Salary · KWSP · Remark</span>
          </p>
          <p className="text-xs text-gray-400 mb-6">IC (NRIC) must be unique — duplicates will be rejected</p>
          <label className="cursor-pointer">
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileInput} />
            <Button type="button" variant="outline" className="pointer-events-none">
              <Upload className="w-4 h-4 mr-2" /> Choose File
            </Button>
          </label>
        </div>
      </div>
    )
  }

  // ── Importing ────────────────────────────────────────────
  if (stage === 'importing') {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        <p className="text-sm text-gray-600">Importing {rows.length} local workers…</p>
      </div>
    )
  }

  // ── Done ────────────────────────────────────────────────
  if (stage === 'done' && result) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-green-50 border border-green-200 rounded-xl p-5 flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-green-600 flex-shrink-0" />
            <div><p className="text-2xl font-bold text-green-700">{result.success}</p><p className="text-sm text-green-600">Imported successfully</p></div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-xl p-5 flex items-center gap-3">
            <XCircle className="w-8 h-8 text-red-600 flex-shrink-0" />
            <div><p className="text-2xl font-bold text-red-700">{result.failed}</p><p className="text-sm text-red-600">Failed</p></div>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 flex items-center gap-3">
            <AlertCircle className="w-8 h-8 text-gray-500 flex-shrink-0" />
            <div><p className="text-2xl font-bold text-gray-700">{rows.length}</p><p className="text-sm text-gray-500">Total rows</p></div>
          </div>
        </div>
        {result.errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <h4 className="font-semibold text-red-700 mb-3">Failed rows</h4>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {result.errors.map((e, i) => (
                <div key={i} className="text-sm text-red-600 flex gap-2">
                  <span className="font-mono font-medium min-w-[4rem]">Row {e.row}:</span>
                  <span className="font-medium">{e.name}</span>
                  <span className="text-red-400">— {e.error}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="flex gap-2">
          <Button onClick={reset} variant="outline">Import Another File</Button>
          <a href="/admin/workers"><Button>View Workers →</Button></a>
        </div>
      </div>
    )
  }

  // ── Preview ──────────────────────────────────────────────
  const duplicateNrics = findDuplicateNrics(rows)
  const duplicateCount = rows.filter(r => r.nric && duplicateNrics.has(r.nric.replace(/\D/g, ''))).length
  const newPositionCount = new Set(
    rows
      .map(r => r.position_name?.toLowerCase())
      .filter((n): n is string => !!n && !positionNames.has(n))
  ).size

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">{rows.length} workers detected</h3>
          <p className="text-sm text-gray-500">Review the data below before importing</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={reset}>← Change File</Button>
          <Button onClick={handleImport} disabled={duplicateCount > 0}>
            <Upload className="w-4 h-4 mr-2" />Import All {rows.length} Workers
          </Button>
        </div>
      </div>

      {duplicateCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-700">{duplicateCount} row{duplicateCount !== 1 ? 's' : ''} with duplicate IC found in this file</p>
            <p className="text-xs text-amber-600 mt-0.5">Fix the file and re-upload before importing.</p>
          </div>
        </div>
      )}

      {newPositionCount > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-blue-700">
            <span className="font-semibold">{newPositionCount} new position{newPositionCount !== 1 ? 's' : ''}</span> (marked <span className="font-mono bg-blue-100 px-1 rounded">+new</span>) will be created automatically during import.
          </p>
        </div>
      )}

      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto max-h-[60vh]">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
              <tr>
                <th className="text-left px-3 py-2.5 font-medium text-gray-600 w-8">#</th>
                <th className="text-left px-3 py-2.5 font-medium text-gray-600 min-w-[150px]">Name</th>
                <th className="text-left px-3 py-2.5 font-medium text-gray-600 min-w-[130px]">IC (NRIC)</th>
                <th className="text-left px-3 py-2.5 font-medium text-gray-600">Gender</th>
                <th className="text-left px-3 py-2.5 font-medium text-gray-600">DOB</th>
                <th className="text-left px-3 py-2.5 font-medium text-gray-600">Position</th>
                <th className="text-left px-3 py-2.5 font-medium text-gray-600">Contact</th>
                <th className="text-left px-3 py-2.5 font-medium text-gray-600">Start Work</th>
                <th className="text-left px-3 py-2.5 font-medium text-gray-600">End Work</th>
                <th className="text-left px-3 py-2.5 font-medium text-gray-600">Salary (RM)</th>
                <th className="text-left px-3 py-2.5 font-medium text-gray-600">Bank</th>
                <th className="text-left px-3 py-2.5 font-medium text-gray-600 min-w-[120px]">Bank Account</th>
                <th className="text-left px-3 py-2.5 font-medium text-gray-600">KWSP</th>
                <th className="text-left px-3 py-2.5 font-medium text-gray-600">Remark</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row, i) => {
                const isDupeNric = row.nric ? duplicateNrics.has(row.nric.replace(/\D/g, '')) : false
                const posIsNew = row.position_name && !positionNames.has(row.position_name.toLowerCase())
                return (
                  <tr key={i} className={`hover:bg-gray-50 ${isDupeNric ? 'bg-amber-50' : ''}`}>
                    <td className="px-3 py-2 text-gray-400 font-mono text-xs">{i + 2}</td>
                    <td className="px-3 py-2 font-medium text-gray-900">
                      {row.name || <span className="text-red-500 italic">missing</span>}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">
                      <span className={isDupeNric ? 'text-amber-600 font-semibold' : 'text-gray-600'}>
                        {row.nric ?? '—'}
                      </span>
                      {isDupeNric && <span className="ml-1 text-amber-500 text-xs">⚠ dupe</span>}
                    </td>
                    <td className="px-3 py-2 text-gray-600 capitalize">{row.gender ?? '—'}</td>
                    <td className="px-3 py-2 text-gray-600">{row.date_of_birth ?? '—'}</td>
                    <td className="px-3 py-2">
                      {row.position_name ? (
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                          posIsNew ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {row.position_name}{posIsNew ? ' +new' : ''}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-3 py-2 text-gray-600">{row.contact_number ?? '—'}</td>
                    <td className="px-3 py-2 text-gray-600">{row.date_start_work ?? '—'}</td>
                    <td className="px-3 py-2 text-gray-600">{row.date_end_work ?? '—'}</td>
                    <td className="px-3 py-2 text-gray-600">
                      {row.current_salary != null ? `RM ${row.current_salary.toFixed(0)}` : '—'}
                    </td>
                    <td className="px-3 py-2 text-gray-600">{row.bank ?? '—'}</td>
                    <td className="px-3 py-2 font-mono text-xs text-gray-600">{row.bank_account_number ?? '—'}</td>
                    <td className="px-3 py-2 font-mono text-xs text-gray-600">{row.kwsp ?? '—'}</td>
                    <td className="px-3 py-2 text-gray-500 text-xs max-w-[140px] truncate">{row.remark ?? '—'}</td>
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
