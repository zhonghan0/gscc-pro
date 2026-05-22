'use client'

import { useState } from 'react'
import { ResidentImporter } from '@/components/residents/ResidentImporter'
import { WorkerImporter } from '@/components/workers/WorkerImporter'
import { LocalWorkerImporter } from '@/components/workers/LocalWorkerImporter'
import { PaymentExcelImporter } from '@/components/payments/PaymentExcelImporter'
import { PaymentDetailImporter } from '@/components/payments/PaymentDetailImporter'
import { CareLogImporter } from '@/components/care-notes/CareLogImporter'
import { Users, HeartHandshake, HardHat, CreditCard, FileText, ClipboardList } from 'lucide-react'

type Tab = 'residents' | 'foreign' | 'local' | 'payments' | 'payments_detail' | 'care_logs'

type Position = { id: string; name: string }

const tabs: { key: Tab; label: string; icon: React.ElementType; description: string; color: string }[] = [
  {
    key: 'residents',
    label: 'Import Residents',
    icon: Users,
    description: 'Upload residents with NRIC, condition, physio, fees and more.',
    color: 'blue',
  },
  {
    key: 'foreign',
    label: 'Import Caregivers',
    icon: HeartHandshake,
    description: 'Upload caregivers with passport, permit, typhoid and salary details.',
    color: 'orange',
  },
  {
    key: 'local',
    label: 'Import Local Workers',
    icon: HardHat,
    description: 'Upload local staff with NRIC, bank, KWSP and position details.',
    color: 'indigo',
  },
  {
    key: 'payments',
    label: 'Import Payments (Grid)',
    icon: CreditCard,
    description: 'Upload payment tracking Excel to bulk-import monthly payment records.',
    color: 'green',
  },
  {
    key: 'payments_detail',
    label: 'Import Payments (Detail)',
    icon: FileText,
    description: 'Upload individual payment records with full details — amount, method, reference and notes.',
    color: 'teal',
  },
  {
    key: 'care_logs',
    label: 'Import Care Logs',
    icon: ClipboardList,
    description: 'Upload care log entries with resident, date/time and note text.',
    color: 'rose',
  },
]

const colorMap: Record<string, { active: string; icon: string; border: string }> = {
  blue:   { active: 'bg-blue-600 text-white shadow',   icon: 'text-blue-600',   border: 'border-blue-600' },
  orange: { active: 'bg-orange-500 text-white shadow', icon: 'text-orange-500', border: 'border-orange-500' },
  indigo: { active: 'bg-indigo-600 text-white shadow', icon: 'text-indigo-600', border: 'border-indigo-600' },
  green:  { active: 'bg-green-600 text-white shadow',  icon: 'text-green-600',  border: 'border-green-600' },
  teal:   { active: 'bg-teal-600 text-white shadow',   icon: 'text-teal-600',   border: 'border-teal-600' },
  rose:   { active: 'bg-rose-500 text-white shadow',   icon: 'text-rose-500',   border: 'border-rose-500' },
}

export function ImportHub({ positions }: { positions: Position[] }) {
  const [active, setActive] = useState<Tab>('residents')

  return (
    <div className="space-y-6">
      {/* Tab selector cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {tabs.map(({ key, label, icon: Icon, description, color }) => {
          const isActive = active === key
          const c = colorMap[color]
          return (
            <button
              key={key}
              onClick={() => setActive(key)}
              className={`text-left rounded-xl border-2 p-4 transition-all flex flex-col ${
                isActive
                  ? `${c.border} bg-white shadow-md`
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
              }`}
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${
                isActive ? c.active : 'bg-gray-100'
              }`}>
                <Icon className={`w-5 h-5 ${isActive ? 'text-white' : c.icon}`} />
              </div>
              <p className={`font-semibold text-sm mb-1 ${isActive ? 'text-gray-900' : 'text-gray-700'}`}>{label}</p>
              <p className="text-xs text-gray-500 leading-relaxed">{description}</p>
            </button>
          )
        })}
      </div>

      {/* How-it-works hint */}
      {active !== 'payments' && active !== 'payments_detail' && active !== 'care_logs' && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-600">
          <strong>How it works:</strong> Download the template, fill in your data, upload the file, review the preview, then click <em>Import All</em>.
        </div>
      )}

      {/* Panel */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        {active === 'residents'        && <ResidentImporter />}
        {active === 'foreign'          && <WorkerImporter />}
        {active === 'local'            && <LocalWorkerImporter positions={positions} />}
        {active === 'payments'         && <PaymentExcelImporter />}
        {active === 'payments_detail'  && <PaymentDetailImporter />}
        {active === 'care_logs'        && <CareLogImporter />}
      </div>
    </div>
  )
}
