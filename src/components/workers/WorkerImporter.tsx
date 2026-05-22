'use client'

import { useState, useCallback } from 'react'
import * as XLSX from 'xlsx'
import { Button } from '@/components/ui/button'
import { bulkImportWorkers, type WorkerImportRow, type WorkerImportResult } from '@/actions/import-workers'
import { Upload, CheckCircle, XCircle, AlertCircle, FileSpreadsheet, Loader2, Download } from 'lucide-react'

// ── Template download ─────────────────────────────────────────
function downloadTemplate() {
  const headers = [
    'Name', 'Nickname', 'Passport No.', 'Country of Origin', 'Gender',
    'DOB', 'Contact No.', 'Date Start Work', 'Date End Work',
    'Passport Expiry', 'Permit Expiry Date', 'Majikan', 'Majikan Email',
    'Salary', 'Typhoid Vaccine Expiry', 'Remark',
  ]
  const example = [
    'Maryati', 'Ati', 'B3628672', 'Indonesia', 'F',
    '28/04/1985', '016-5892410', '01/03/2020', '',
    '21/12/2026', '13/08/2026', 'Sim Szu Lit', 'graceville.simszulit@gmail.com',
    '2200', '30/11/2025', '',
  ]

  const ws = XLSX.utils.aoa_to_sheet([headers, example])
  ws['!cols'] = [
    { wch: 22 }, { wch: 14 }, { wch: 18 }, { wch: 8 },
    { wch: 12 }, { wch: 15 }, { wch: 16 }, { wch: 15 },
    { wch: 16 }, { wch: 18 }, { wch: 20 }, { wch: 30 },
    { wch: 10 }, { wch: 22 }, { wch: 20 },
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Caregivers')
  XLSX.writeFile(wb, 'caregivers_template.xlsx')
}

// ── Date parsing ──────────────────────────────────────────────
/** Handles Excel serial numbers, DD/MM/YYYY, DD-MM-YYYY, ISO and other strings */
function parseDate(raw: unknown): string | null {
  if (raw == null || raw === '') return null

  if (typeof raw === 'number') {
    const date = XLSX.SSF.parse_date_code(raw)
    if (date) {
      return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`
    }
  }

  const str = raw.toString().trim()
  if (!str) return null

  // DD/MM/YYYY
  const slashMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (slashMatch) {
    const [, dd, mm, yyyy] = slashMatch
    return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`
  }

  // DD-MM-YYYY
  const dashMatch = str.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/)
  if (dashMatch) {
    const [, dd, mm, yyyy] = dashMatch
    return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`
  }

  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.substring(0, 10)

  const d = new Date(str)
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]

  return null
}

function mapGender(raw: unknown): 'male' | 'female' | null {
  if (!raw) return null
  const v = raw.toString().trim().toLowerCase()
  if (v === 'f' || v === 'female') return 'female'
  if (v === 'm' || v === 'male') return 'male'
  return null
}

function parseRow(row: Record<string, unknown>): WorkerImportRow {
  const name = (row['Name'] ?? row['name'] ?? '').toString().trim()
  const nickname = (row['Nickname'] ?? row['nickname'] ?? '').toString().trim() || null

  const passport = (row['Passport No.'] ?? row['Passport/ IC'] ?? row['Passport/IC'] ?? row['Passport'] ?? row['IC'] ?? '').toString().trim() || null
  const country = (row['Country of Origin'] ?? row['Country'] ?? '').toString().trim() || null
  const contact = (row['Contact No.'] ?? row['Contact'] ?? '').toString().trim() || null
  const majikan = (row['Majikan'] ?? '').toString().trim() || null
  const majikanEmail = (row['Majikan Email'] ?? row['Email'] ?? '').toString().trim() || null
  const remark = (row['Remark'] ?? '').toString().trim() || null

  const rawSalary = row['Salary'] ?? null
  const salary = rawSalary != null && rawSalary !== '' ? parseFloat(rawSalary.toString()) : null

  return {
    name,
    nickname,
    passport_number: passport,
    country_of_origin: country,
    gender: mapGender(row['Gender']),
    date_of_birth: parseDate(row['DOB'] ?? row['Date of Birth']),
    contact_number: contact,
    date_start_work: parseDate(row['Date Start Work'] ?? row['Start Date']),
    date_end_work: parseDate(row['Date End Work'] ?? row['End Date']) ,
    passport_expiry: parseDate(row['Passport Expiry'] ?? row['Passport Exp']),
    passport_permit_date: parseDate(row['Permit Expiry Date'] ?? row['Permit Date'] ?? row['Permit Expiry']),
    majikan,
    majikan_email: majikanEmail || null,
    current_salary: salary != null && !isNaN(salary) ? salary : null,
    typhoid_vaccine_expiry: parseDate(row['Typhoid Vaccine Expiry'] ?? row['Typhoid Expiry'] ?? row['Typhoid']),
    remark,
  }
}

// ── Duplicate passport detection ──────────────────────────────
function findDuplicatePassports(rows: WorkerImportRow[]): Set<string> {
  const seen = new Map<string, number>()
  const dupes = new Set<string>()
  rows.forEach(r => {
    if (!r.passport_number) return
    const key = r.passport_number.toUpperCase()
    seen.set(key, (seen.get(key) ?? 0) + 1)
    if ((seen.get(key) ?? 0) > 1) dupes.add(key)
  })
  return dupes
}

// ── Component ─────────────────────────────────────────────────
type Stage = 'idle' | 'preview' | 'importing' | 'done'

export function WorkerImporter() {
  const [stage, setStage] = useState<Stage>('idle')
  const [rows, setRows] = useState<WorkerImportRow[]>([])
  const [result, setResult] = useState<WorkerImportResult | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const processFile = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const data = new Uint8Array(e.target!.result as ArrayBuffer)
      const workbook = XLSX.read(data, { type: 'array', cellDates: false })
      const sheetName = workbook.SheetNames[0]
      const sheet = workbook.Sheets[sheetName]
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
      const res = await bulkImportWorkers(rows)
      setResult(res)
      setStage('done')
    } catch (err) {
      setResult({ success: 0, failed: rows.length, errors: [{ row: 0, name: 'All rows', error: (err as Error).message }] })
      setStage('done')
    }
  }

  const reset = () => {
    setStage('idle')
    setRows([])
    setResult(null)
  }

  // ── Idle / Drop zone ───────────────────────────────────────
  if (stage === 'idle') {
    return (
      <div className="space-y-4">
        {/* Template download */}
        <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
          <div>
            <p className="text-sm font-medium text-gray-700">Need the correct format?</p>
            <p className="text-xs text-gray-500 mt-0.5">Download the template with the right headers and an example row.</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={downloadTemplate}>
            <Download className="w-4 h-4 mr-2" /> Download Template
          </Button>
        </div>

        {/* Drop zone */}
        <div
          className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer ${
            dragOver ? 'border-orange-400 bg-orange-50' : 'border-gray-200 hover:border-gray-300'
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <FileSpreadsheet className="w-12 h-12 mx-auto text-orange-500 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Drop your Excel file here</h3>
          <p className="text-sm text-gray-500 mb-1">
            Columns: <span className="font-mono text-xs">Name · Passport No. · Country of Origin · Gender · DOB · Contact No. · Date Start Work · Date End Work · Passport Expiry · Permit Expiry Date · Majikan · Majikan Email · Salary · Typhoid Vaccine Expiry · Remark</span>
          </p>
          <p className="text-xs text-gray-400 mb-6">Passport No. duplicates in the file will be flagged before import</p>
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

  // ── Importing spinner ──────────────────────────────────────
  if (stage === 'importing') {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
        <p className="text-sm text-gray-600">Importing {rows.length} caregivers…</p>
      </div>
    )
  }

  // ── Done ───────────────────────────────────────────────────
  if (stage === 'done' && result) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-green-50 border border-green-200 rounded-xl p-5 flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-green-600 flex-shrink-0" />
            <div>
              <p className="text-2xl font-bold text-green-700">{result.success}</p>
              <p className="text-sm text-green-600">Imported successfully</p>
            </div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-xl p-5 flex items-center gap-3">
            <XCircle className="w-8 h-8 text-red-600 flex-shrink-0" />
            <div>
              <p className="text-2xl font-bold text-red-700">{result.failed}</p>
              <p className="text-sm text-red-600">Failed</p>
            </div>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 flex items-center gap-3">
            <AlertCircle className="w-8 h-8 text-gray-500 flex-shrink-0" />
            <div>
              <p className="text-2xl font-bold text-gray-700">{rows.length}</p>
              <p className="text-sm text-gray-500">Total rows</p>
            </div>
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
          <a href="/admin/workers">
            <Button>View Workers →</Button>
          </a>
        </div>
      </div>
    )
  }

  // ── Preview ────────────────────────────────────────────────
  const duplicatePassports = findDuplicatePassports(rows)
  const duplicateCount = rows.filter(r =>
    r.passport_number && duplicatePassports.has(r.passport_number.toUpperCase())
  ).length

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
            <Upload className="w-4 h-4 mr-2" />
            Import All {rows.length} Workers
          </Button>
        </div>
      </div>

      {/* Duplicate passport warning */}
      {duplicateCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-700">
              {duplicateCount} row{duplicateCount !== 1 ? 's' : ''} with duplicate Passport No. found in this file
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              Highlighted rows share the same Passport No. Fix the file and re-upload before importing.
            </p>
          </div>
        </div>
      )}

      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto max-h-[60vh]">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
              <tr>
                <th className="text-left px-3 py-2.5 font-medium text-gray-600 w-8">#</th>
                <th className="text-left px-3 py-2.5 font-medium text-gray-600 min-w-[150px]">Name</th>
                <th className="text-left px-3 py-2.5 font-medium text-gray-600 min-w-[110px]">Passport No.</th>
                <th className="text-left px-3 py-2.5 font-medium text-gray-600">Country</th>
                <th className="text-left px-3 py-2.5 font-medium text-gray-600">Gender</th>
                <th className="text-left px-3 py-2.5 font-medium text-gray-600">DOB</th>
                <th className="text-left px-3 py-2.5 font-medium text-gray-600">Contact</th>
                <th className="text-left px-3 py-2.5 font-medium text-gray-600">Start Work</th>
                <th className="text-left px-3 py-2.5 font-medium text-gray-600">Passport Exp.</th>
                <th className="text-left px-3 py-2.5 font-medium text-gray-600">Permit Exp.</th>
                <th className="text-left px-3 py-2.5 font-medium text-gray-600">Typhoid Exp.</th>
                <th className="text-left px-3 py-2.5 font-medium text-gray-600">Majikan</th>
                <th className="text-left px-3 py-2.5 font-medium text-gray-600">Salary (RM)</th>
                <th className="text-left px-3 py-2.5 font-medium text-gray-600">Remark</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row, i) => {
                const isDupe = row.passport_number
                  ? duplicatePassports.has(row.passport_number.toUpperCase())
                  : false
                return (
                  <tr key={i} className={`hover:bg-gray-50 ${isDupe ? 'bg-amber-50' : ''}`}>
                    <td className="px-3 py-2 text-gray-400 font-mono text-xs">{i + 2}</td>
                    <td className="px-3 py-2 font-medium text-gray-900">
                      {row.name || <span className="text-red-500 italic">missing</span>}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">
                      <span className={isDupe ? 'text-amber-600 font-semibold' : 'text-gray-600'}>
                        {row.passport_number ?? '—'}
                      </span>
                      {isDupe && <span className="ml-1 text-amber-500 text-xs">⚠ dupe</span>}
                    </td>
                    <td className="px-3 py-2 text-gray-600">{row.country_of_origin ?? '—'}</td>
                    <td className="px-3 py-2 text-gray-600 capitalize">{row.gender ?? '—'}</td>
                    <td className="px-3 py-2 text-gray-600">{row.date_of_birth ?? '—'}</td>
                    <td className="px-3 py-2 text-gray-600">{row.contact_number ?? '—'}</td>
                    <td className="px-3 py-2 text-gray-600">{row.date_start_work ?? '—'}</td>
                    <td className="px-3 py-2 text-gray-600">{row.passport_expiry ?? '—'}</td>
                    <td className="px-3 py-2 text-gray-600">{row.passport_permit_date ?? '—'}</td>
                    <td className="px-3 py-2 text-gray-600">{row.typhoid_vaccine_expiry ?? '—'}</td>
                    <td className="px-3 py-2 text-gray-600">
                      <div>{row.majikan ?? '—'}</div>
                      {row.majikan_email && (
                        <div className="text-xs text-gray-400 truncate max-w-[140px]">{row.majikan_email}</div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-gray-600">
                      {row.current_salary != null ? `RM ${row.current_salary.toFixed(2)}` : '—'}
                    </td>
                    <td className="px-3 py-2 text-gray-500 text-xs max-w-[140px] truncate">
                      {row.remark ?? '—'}
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
