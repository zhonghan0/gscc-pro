'use client'

import { useState, useCallback } from 'react'
import * as XLSX from 'xlsx'
import { Button } from '@/components/ui/button'
import { parseNRIC, formatNRIC } from '@/lib/utils'
import { bulkImportResidents, type ImportRow, type ImportResult } from '@/actions/import-residents'
import { Upload, CheckCircle, XCircle, AlertCircle, FileSpreadsheet, Loader2, Download } from 'lucide-react'
import { HEALTH_CONDITIONS } from '@/lib/constants'

// ── Template download ─────────────────────────────────────────
function downloadTemplate() {
  const baseHeaders = ['Name', 'NRIC', 'Caregiver', 'Condition', 'Address', 'DOA', 'Date of Discharge', 'Remark', 'NET', 'Physio', 'Physio Remark', 'Pay day', 'Fees']
  const headers = [...baseHeaders, ...HEALTH_CONDITIONS, 'Health Remark']

  const baseExample = [
    'Tan Ah Kow',
    '501215-14-5678',
    '',  // Caregiver nickname (optional)
    'Mobile',
    '123 Jalan Merdeka, Kuala Lumpur',
    '15/01/2024',
    '',  // Date of Discharge (leave blank for active residents)
    '',
    'Yes',
    'Yes',
    '',
    '1',
    '1500.00',
  ]
  // All conditions default to No in the example row; Health Remark is blank
  const example = [...baseExample, ...HEALTH_CONDITIONS.map(() => 'No'), '']

  const ws = XLSX.utils.aoa_to_sheet([headers, example])
  ws['!cols'] = [
    { wch: 25 }, { wch: 18 }, { wch: 16 }, { wch: 15 }, { wch: 35 },
    { wch: 12 }, { wch: 16 }, { wch: 15 }, { wch: 8 }, { wch: 20 },
    { wch: 20 }, { wch: 10 }, { wch: 10 },
    // condition columns + health remark
    ...HEALTH_CONDITIONS.map(() => ({ wch: 18 })),
    { wch: 25 },
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Residents')
  XLSX.writeFile(wb, 'residents_template.xlsx')
}

// ── Value mappings ────────────────────────────────────────────
function mapCondition(raw: string | null): ImportRow['condition'] {
  if (!raw) return null
  const v = raw.toString().trim().toLowerCase()
  if (v === 'wheelchair' || v === 'wheelchair_bound') return 'wheelchair_bound'
  if (v === 'mobile') return 'mobile'
  if (v === 'bedridden') return 'bedridden'
  return null
}

function mapPhysio(raw: string | null): ImportRow['physio'] {
  if (!raw) return null
  const v = raw.toString().trim().toLowerCase()
  if (v === 'yes') return 'yes'
  if (v === 'no') return 'no'
  if (v === 'yes(foc)' || v === 'foc') return 'foc'
  if (v === 'yes(alternate day)' || v === 'alternate_day' || v === 'alternate day') return 'alternate_day'
  return null
}

/** Parse DOA: handles DD/MM/YYYY strings AND Excel serial numbers AND ISO strings */
function parseDOA(raw: unknown): string {
  if (!raw) return new Date().toISOString().split('T')[0]

  if (typeof raw === 'number') {
    const date = XLSX.SSF.parse_date_code(raw)
    if (date) {
      return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`
    }
  }

  const str = raw.toString().trim()

  // DD/MM/YYYY
  const ddmm = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (ddmm) {
    const [, dd, mm, yyyy] = ddmm
    return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`
  }

  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.substring(0, 10)

  const d = new Date(str)
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]

  return new Date().toISOString().split('T')[0]
}

function parseNRICField(raw: unknown): string | null {
  if (raw == null) return null
  const str = raw.toString().trim().replace(/\D/g, '')
  if (!str) return null
  const formatted = formatNRIC(str)
  return formatted || null
}

function parseRow(row: Record<string, unknown>): ImportRow {
  const name = (row['Name'] ?? row['name'] ?? '').toString().trim()
  const rawNric = parseNRICField(row['NRIC'] ?? row['nric'] ?? row['IC'])
  const parsed = rawNric ? parseNRIC(rawNric) : null

  const rawFee = row['Fees'] ?? row['Fees 2026'] ?? row['Fee'] ?? null
  const fee = rawFee != null && rawFee !== '' ? parseFloat(rawFee.toString()) : null

  const rawPayDay = row['Pay day'] ?? row['Pay Day'] ?? row['pay_day'] ?? null
  const payDay = rawPayDay != null && rawPayDay !== '' ? parseInt(rawPayDay.toString(), 10) : null

  const remark = (row['Remark'] ?? row['remark'] ?? '').toString().trim() || null
  const physioRemark = (row['Physio Remark'] ?? row['physio_remark'] ?? '').toString().trim() || null

  // NET column → include_misc (yes/y/true = true, else false)
  const rawNet = (row['NET'] ?? row['Net'] ?? row['net'] ?? '').toString().trim().toLowerCase()
  const includeMisc = rawNet === 'yes' || rawNet === 'y' || rawNet === 'true'

  // Health conditions — each condition is its own column with Yes/No
  const selectedConditions = HEALTH_CONDITIONS.filter(c => {
    const val = (row[c] ?? '').toString().trim().toLowerCase()
    return val === 'yes' || val === 'y' || val === 'true'
  })
  const healthCondition = selectedConditions.length > 0 ? selectedConditions.join(', ') : null

  const rawDischarge = row['Date of Discharge'] ?? row['Discharge Date'] ?? row['DOD'] ?? null
  const dateOfDischarge = rawDischarge && rawDischarge.toString().trim() ? parseDOA(rawDischarge) : null

  const healthRemark = (row['Health Remark'] ?? row['health_remark'] ?? '').toString().trim() || null

  return {
    full_name: name,
    nric: rawNric,
    date_of_birth: parsed?.dob ?? null,
    gender: parsed?.gender ?? null,
    condition: mapCondition((row['Condition'] ?? '').toString()),
    address: (row['Address'] ?? '').toString().trim() || null,
    admission_date: parseDOA(row['DOA'] ?? row['Admission Date'] ?? row['Date of Admission']),
    date_of_discharge: dateOfDischarge,
    physio: mapPhysio((row['Physio'] ?? '').toString()) ?? 'no',
    physio_remark: physioRemark,
    pay_day: isNaN(payDay as number) ? null : payDay,
    fee: isNaN(fee as number) ? null : fee,
    package_remark: remark,
    include_misc: includeMisc,
    status: dateOfDischarge ? 'discharged' : 'active',
    health_condition: healthCondition,
    health_remark: healthRemark,
    caregiver_nickname: (row['Caregiver'] ?? '').toString().trim() || null,
  }
}

// ── Duplicate NRIC detection ──────────────────────────────────
function findDuplicateNrics(rows: ImportRow[]): Set<string> {
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

export function ResidentImporter() {
  const [stage, setStage] = useState<Stage>('idle')
  const [rows, setRows] = useState<ImportRow[]>([])
  const [result, setResult] = useState<ImportResult | null>(null)
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
    // Reset input so the same file can be re-selected
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
      const res = await bulkImportResidents(rows)
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
            dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <FileSpreadsheet className="w-12 h-12 mx-auto text-green-600 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Drop your Excel file here</h3>
          <p className="text-sm text-gray-500 mb-1">
            Columns: <span className="font-mono text-xs">Name · NRIC · Condition · Address · DOA · Remark · Physio · Physio Remark · Pay day · Fees</span>
          </p>
          <p className="text-xs text-gray-400 mb-6">NRIC must be unique — duplicates will be rejected</p>
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
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        <p className="text-sm text-gray-600">Importing {rows.length} residents…</p>
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
          <a href="/residents">
            <Button>View Residents →</Button>
          </a>
        </div>
      </div>
    )
  }

  // ── Preview ────────────────────────────────────────────────
  const duplicateNrics = findDuplicateNrics(rows)
  const duplicateCount = rows.filter(r => r.nric && duplicateNrics.has(r.nric.replace(/\D/g, ''))).length

  const conditionColor: Record<string, string> = {
    mobile: 'bg-green-100 text-green-700',
    wheelchair_bound: 'bg-blue-100 text-blue-700',
    bedridden: 'bg-red-100 text-red-700',
  }
  const conditionLabel: Record<string, string> = {
    mobile: 'Mobile',
    wheelchair_bound: 'Wheelchair',
    bedridden: 'Bedridden',
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">{rows.length} residents detected</h3>
          <p className="text-sm text-gray-500">Review the data below before importing</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={reset}>← Change File</Button>
          <Button onClick={handleImport} disabled={duplicateCount > 0}>
            <Upload className="w-4 h-4 mr-2" />
            Import All {rows.length} Residents
          </Button>
        </div>
      </div>

      {/* Duplicate NRIC warning */}
      {duplicateCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-700">
              {duplicateCount} row{duplicateCount !== 1 ? 's' : ''} with duplicate NRIC found in this file
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              Highlighted rows share the same NRIC. Fix the file and re-upload before importing.
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
                <th className="text-left px-3 py-2.5 font-medium text-gray-600 min-w-[160px]">Name</th>
                <th className="text-left px-3 py-2.5 font-medium text-gray-600 min-w-[130px]">NRIC</th>
                <th className="text-left px-3 py-2.5 font-medium text-gray-600">DOB</th>
                <th className="text-left px-3 py-2.5 font-medium text-gray-600">Gender</th>
                <th className="text-left px-3 py-2.5 font-medium text-gray-600">Caregiver</th>
                <th className="text-left px-3 py-2.5 font-medium text-gray-600">Condition</th>
                <th className="text-left px-3 py-2.5 font-medium text-gray-600">Admission</th>
                <th className="text-left px-3 py-2.5 font-medium text-gray-600">Discharge</th>
                <th className="text-left px-3 py-2.5 font-medium text-gray-600">NET</th>
                <th className="text-left px-3 py-2.5 font-medium text-gray-600">Physio</th>
                <th className="text-left px-3 py-2.5 font-medium text-gray-600">Pay Day</th>
                <th className="text-left px-3 py-2.5 font-medium text-gray-600">Fee (RM)</th>
                <th className="text-left px-3 py-2.5 font-medium text-gray-600">Remark</th>
                <th className="text-left px-3 py-2.5 font-medium text-gray-600 min-w-[200px]">Health Conditions</th>
                <th className="text-left px-3 py-2.5 font-medium text-gray-600 min-w-[150px]">Health Remark</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row, i) => {
                const isDupeNric = row.nric ? duplicateNrics.has(row.nric.replace(/\D/g, '')) : false
                return (
                  <tr key={i} className={`hover:bg-gray-50 ${isDupeNric ? 'bg-amber-50' : ''}`}>
                    <td className="px-3 py-2 text-gray-400 font-mono text-xs">{i + 2}</td>
                    <td className="px-3 py-2 font-medium text-gray-900">{row.full_name || <span className="text-red-500 italic">missing</span>}</td>
                    <td className="px-3 py-2 font-mono text-xs">
                      <span className={isDupeNric ? 'text-amber-600 font-semibold' : 'text-gray-600'}>
                        {row.nric ?? '—'}
                      </span>
                      {isDupeNric && <span className="ml-1 text-amber-500 text-xs">⚠ dupe</span>}
                    </td>
                    <td className="px-3 py-2 text-gray-600">{row.date_of_birth ?? '—'}</td>
                    <td className="px-3 py-2 text-gray-600 capitalize">{row.gender ?? '—'}</td>
                    <td className="px-3 py-2 text-xs text-gray-600">
                      {row.caregiver_nickname
                        ? <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded font-medium">{row.caregiver_nickname}</span>
                        : '—'}
                    </td>
                    <td className="px-3 py-2">
                      {row.condition ? (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${conditionColor[row.condition] ?? 'bg-gray-100 text-gray-600'}`}>
                          {conditionLabel[row.condition] ?? row.condition}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-3 py-2 text-gray-600">{row.admission_date}</td>
                    <td className="px-3 py-2 text-gray-600">{row.date_of_discharge ?? '—'}</td>
                    <td className="px-3 py-2">
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${row.include_misc ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {row.include_misc ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-600 capitalize">{row.physio ?? '—'}</td>
                    <td className="px-3 py-2 text-gray-600">{row.pay_day ?? '—'}</td>
                    <td className="px-3 py-2 text-gray-600">
                      {row.fee != null ? `RM ${row.fee.toFixed(2)}` : '—'}
                    </td>
                    <td className="px-3 py-2 text-gray-500 text-xs max-w-[150px] truncate">{row.package_remark ?? '—'}</td>
                    <td className="px-3 py-2 text-xs text-gray-600 max-w-[200px]">
                      {row.health_condition
                        ? <span className="text-indigo-700">{row.health_condition}</span>
                        : '—'}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-500 max-w-[150px] truncate">{row.health_remark ?? '—'}</td>
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
