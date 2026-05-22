'use client'

import { useRef, useState, useTransition } from 'react'
import { importPaymentExcel } from '@/actions/payments'
import { Button } from '@/components/ui/button'
import { Upload, CheckCircle, AlertCircle } from 'lucide-react'

interface Result {
  imported: number
  skipped: number
  errors: string[]
}

export function PaymentExcelImporter() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    setFileName(f?.name ?? null)
    setResult(null)
    setError(null)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const file = fileRef.current?.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)

    setResult(null)
    setError(null)

    startTransition(async () => {
      try {
        const res = await importPaymentExcel(formData)
        setResult(res)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Import failed')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Payment Excel File (.xlsx)
        </label>
        <div className="flex items-center gap-3">
          <label className="cursor-pointer flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm text-gray-700 hover:bg-gray-50 transition-colors">
            <Upload className="w-4 h-4 text-gray-400" />
            {fileName ? (
              <span className="max-w-[200px] truncate text-gray-900">{fileName}</span>
            ) : (
              <span className="text-gray-500">Choose file…</span>
            )}
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx"
              className="sr-only"
              onChange={handleFileChange}
            />
          </label>

          <Button type="submit" disabled={!fileName || isPending} size="sm">
            {isPending ? 'Importing…' : 'Import'}
          </Button>
        </div>
        <p className="mt-1 text-xs text-gray-400">
          Accepts Payment.xlsx — row 1 = headers, cols 3+ = month dates, cells = payment date received.
        </p>
      </div>

      {result && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 space-y-1">
          <div className="flex items-center gap-2 text-sm font-medium text-green-800">
            <CheckCircle className="w-4 h-4" />
            Import complete
          </div>
          <p className="text-sm text-green-700">
            Imported <strong>{result.imported}</strong> payment{result.imported !== 1 ? 's' : ''},{' '}
            skipped <strong>{result.skipped}</strong> duplicate{result.skipped !== 1 ? 's' : ''}.
          </p>
          {result.errors.length > 0 && (
            <ul className="mt-2 space-y-0.5">
              {result.errors.map((e, i) => (
                <li key={i} className="text-xs text-amber-700 flex items-start gap-1">
                  <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
                  {e}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          {error}
        </div>
      )}
    </form>
  )
}
