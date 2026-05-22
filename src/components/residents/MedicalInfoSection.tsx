// @ts-nocheck — legacy component, no longer used
import type { Resident } from '@/lib/types'
import { Badge } from '@/components/ui/badge'

export function MedicalInfoSection({ resident }: { resident: Resident }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
      <h3 className="font-semibold text-gray-900">Medical Information</h3>

      <InfoRow label="Medical Conditions">
        {resident.medical_conditions?.length ? (
          <div className="flex flex-wrap gap-1">
            {resident.medical_conditions.map(c => <Badge key={c} variant="secondary">{c}</Badge>)}
          </div>
        ) : <span className="text-gray-400 text-sm">None recorded</span>}
      </InfoRow>

      <InfoRow label="Medications">
        {resident.medications?.length ? (
          <ul className="text-sm text-gray-700 space-y-0.5">
            {resident.medications.map(m => <li key={m}>• {m}</li>)}
          </ul>
        ) : <span className="text-gray-400 text-sm">None recorded</span>}
      </InfoRow>

      <InfoRow label="Allergies">
        {resident.allergies?.length ? (
          <div className="flex flex-wrap gap-1">
            {resident.allergies.map(a => <Badge key={a} variant="destructive">{a}</Badge>)}
          </div>
        ) : <span className="text-gray-400 text-sm">None recorded</span>}
      </InfoRow>

      <InfoRow label="Primary Doctor">
        {resident.primary_doctor_name ? (
          <div className="text-sm">
            <p className="text-gray-900">{resident.primary_doctor_name}</p>
            {resident.primary_doctor_phone && <p className="text-gray-500">{resident.primary_doctor_phone}</p>}
          </div>
        ) : <span className="text-gray-400 text-sm">Not assigned</span>}
      </InfoRow>
    </div>
  )
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      {children}
    </div>
  )
}
