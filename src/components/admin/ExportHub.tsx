'use client'

import { Download } from 'lucide-react'

const EXPORTS = [
  {
    label: 'Residents',
    description: 'Name, NRIC, condition, physio, fees, health conditions and more.',
    href: '/api/export/residents',
    color: 'blue',
  },
  {
    label: 'Caregivers',
    description: 'Passport, permit, typhoid, salary and employer details.',
    href: '/api/export/caregivers',
    color: 'orange',
  },
  {
    label: 'Local Workers',
    description: 'IC, position, bank account, KWSP and salary details.',
    href: '/api/export/local-workers',
    color: 'indigo',
  },
  {
    label: 'Payments (Grid)',
    description: 'Full payment grid — last 24 months, one column per month.',
    href: '/api/export/payments',
    color: 'green',
  },
  {
    label: 'Payments (Detail)',
    description: 'All payment records with full details — date, for month, amount, method, reference and notes.',
    href: '/api/export/payments-detail',
    color: 'teal',
  },
  {
    label: 'Care Logs',
    description: 'All care log entries with resident, date, author and note text.',
    href: '/api/export/care-logs',
    color: 'rose',
  },
]

const badge: Record<string, string> = {
  blue:   'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100',
  orange: 'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100',
  indigo: 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100',
  green:  'bg-green-50 border-green-200 text-green-700 hover:bg-green-100',
  teal:   'bg-teal-50 border-teal-200 text-teal-700 hover:bg-teal-100',
  rose:   'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100',
}

export function ExportHub() {
  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500">
        Each file uses the same column layout as its import template, so it can be re-imported after editing.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {EXPORTS.map(({ label, description, href, color }) => (
          <a
            key={href}
            href={href}
            download
            className={`flex items-start gap-4 p-5 rounded-xl border-2 transition-all ${badge[color]}`}
          >
            <Download className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-sm">{label}</p>
              <p className="text-xs opacity-75 mt-0.5 leading-snug">{description}</p>
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}
