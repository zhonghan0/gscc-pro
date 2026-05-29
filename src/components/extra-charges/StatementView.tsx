'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Charge {
  id: string
  charge_date: string | null
  description: string
  amount: number
  quantity: number | null
  notes: string | null
}

interface Resident {
  id: string
  full_name: string
  fee: number | null
}

interface Props {
  resident: Resident
  month: string        // YYYY-MM
  charges: Charge[]
  currentMonth: string // YYYY-MM
}

function fmtDate(d: string): string {
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

function fmtMonth(ym: string): string {
  const [y, m] = ym.split('-')
  const date = new Date(parseInt(y), parseInt(m) - 1, 1)
  return date.toLocaleDateString('en-MY', { month: 'long', year: 'numeric' })
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

function fmtRM(n: number): string {
  return n.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function StatementView({ resident, month, charges, currentMonth }: Props) {
  const tableRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const [copying, setCopying] = useState(false)
  const [copied, setCopied] = useState(false)

  const fee = resident.fee ?? 0
  const extrasTotal = charges.reduce((s, c) => s + c.amount, 0)
  const amountDue = fee + extrasTotal

  const goBack = useCallback(() => router.back(), [router])

  // Keyboard shortcuts: Esc → back, C → copy as image
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Don't fire when typing in an input / textarea
      if (e.target instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return
      if (e.key === 'Escape') goBack()
      if ((e.key === 'c' || e.key === 'C') && !e.metaKey && !e.ctrlKey) copyAsImage()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goBack, copying])

  // Billing date = 1st of the billing month
  const [y, m] = month.split('-')
  const billingDate = `01/${m}/${y}`

  async function copyAsImage() {
    if (!tableRef.current) return
    setCopying(true)
    try {
      const { toPng } = await import('html-to-image')
      const dataUrl = await toPng(tableRef.current, {
        backgroundColor: '#ffffff',
        pixelRatio: 2,
        style: { borderRadius: '0' },
      })
      const res = await fetch(dataUrl)
      const blob = await res.blob()
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob }),
      ])
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    } catch (err) {
      console.error('Copy failed:', err)
      alert('Could not copy image. Your browser may not support this feature.')
    } finally {
      setCopying(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Toolbar — not captured */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between no-print">
        <div className="flex items-center gap-3">
          <button
            onClick={goBack}
            title="Go back (Esc)"
            className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back
            <kbd className="ml-0.5 text-[10px] text-gray-400 border border-gray-200 rounded px-1 py-0.5 font-mono leading-none">Esc</kbd>
          </button>
          <span className="text-gray-300">|</span>
          <span className="text-sm font-medium text-gray-700">{resident.full_name}</span>
        </div>

        {/* Month navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push(`/residents/${resident.id}/statement?month=${prevMonth(month)}`)}
            className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold text-gray-800 w-36 text-center">{fmtMonth(month)}</span>
          <button
            onClick={() => router.push(`/residents/${resident.id}/statement?month=${nextMonth(month)}`)}
            className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <Button onClick={copyAsImage} disabled={copying} size="sm" title="Copy as image (C)">
          <Camera className="w-4 h-4" />
          {copying ? 'Capturing…' : copied ? '✓ Copied!' : 'Copy as Image'}
          {!copying && !copied && (
            <kbd className="ml-1 text-[10px] opacity-60 border border-white/40 rounded px-1 py-0.5 font-mono leading-none">C</kbd>
          )}
        </Button>
      </div>

      {/* Statement — this is what gets captured */}
      <div className="flex justify-center py-8 px-4">
        <div
          ref={tableRef}
          className="bg-white shadow-sm"
          style={{ width: 480, fontFamily: 'system-ui, sans-serif' }}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b-2 border-gray-800 flex items-start justify-between">
            <div>
              <p className="font-bold text-gray-900 text-base leading-tight">{resident.full_name}</p>
            </div>
            <p className="text-sm text-gray-600">{billingDate}</p>
          </div>

          {/* Table */}
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-300 bg-gray-50">
                <th className="text-left px-4 py-2 font-semibold text-gray-700 w-24">Date</th>
                <th className="text-left px-4 py-2 font-semibold text-gray-700">Description</th>
                <th className="text-right px-4 py-2 font-semibold text-gray-700 w-24">RM</th>
              </tr>
            </thead>
            <tbody>
              {/* Monthly fee row */}
              <tr className="border-b border-gray-100">
                <td className="px-4 py-2 text-gray-500 text-xs">{billingDate}</td>
                <td className="px-4 py-2 text-gray-900">{fmtMonth(month).split(' ')[0]} fee</td>
                <td className="px-4 py-2 text-right text-gray-900">{fmtRM(fee)}</td>
              </tr>
              {/* Extra charges */}
              {charges.map(charge => {
                const qty = charge.quantity ?? 1
                return (
                  <tr key={charge.id} className="border-b border-gray-100">
                    <td className="px-4 py-2 text-gray-500 text-xs">{charge.charge_date ? fmtDate(charge.charge_date) : ''}</td>
                    <td className="px-4 py-2 text-gray-900">
                      {charge.description}
                      {qty > 1 && (
                        <span className="ml-1.5 text-gray-400 text-xs">×{qty}</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right text-gray-900">{fmtRM(charge.amount)}</td>
                  </tr>
                )
              })}
              {charges.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-3 text-center text-xs text-gray-400 italic">No extra charges this month</td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-800 bg-gray-50">
                <td colSpan={2} className="px-4 py-3 font-bold text-gray-900">Amount Due</td>
                <td className="px-4 py-3 text-right font-bold text-gray-900 text-base">{fmtRM(amountDue)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {copied && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-sm px-4 py-2.5 rounded-full shadow-lg no-print">
          Image copied — paste into WhatsApp
        </div>
      )}
    </div>
  )
}
