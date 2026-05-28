import { notFound } from 'next/navigation'
import Link from 'next/link'
import { isElevated } from '@/lib/permissions'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { StatusBadge } from '@/components/residents/StatusBadge'
import { CareNoteList } from '@/components/care-notes/CareNoteList'
import { ResidentKeyboardNav } from '@/components/residents/ResidentKeyboardNav'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'
import { Edit, ClipboardList, Receipt } from 'lucide-react'
import type { Resident } from '@/lib/types'
import { DischargeButton } from '@/components/residents/DischargeButton'

const CONDITION_LABEL: Record<string, string> = {
  mobile: 'Mobile',
  wheelchair_bound: 'Wheelchair Bound',
  bedridden: 'Bedridden',
}

const PHYSIO_LABEL: Record<string, string> = {
  yes: 'Yes',
  no: 'No',
  foc: 'FOC (Free of Charge)',
  alternate_day: 'Alternate Day',
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-0.5 sm:gap-4 py-2.5 border-b border-gray-100 last:border-0">
      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide sm:w-36 flex-shrink-0">
        {label}
      </span>
      <span className="text-sm text-gray-900">{value ?? '—'}</span>
    </div>
  )
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="font-semibold text-gray-900 mb-4">{title}</h3>
      {children}
    </div>
  )
}

function ageFromDob(dob: string | null): string {
  if (!dob) return '—'
  const age = Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 3600 * 1000))
  return age > 0 ? `${age}yr` : '—'
}

export default async function ResidentProfilePage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  const [{ data: residentRaw }, { data: { user } }] = await Promise.all([
    supabase.from('residents').select('*, workers(id, name)').eq('id', params.id).single(),
    supabase.auth.getUser(),
  ])

  if (!residentRaw) notFound()
  const resident = residentRaw as unknown as Resident & { workers?: { id: string; name: string } | null }

  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const [
    { data: profileData },
    { data: careNotesRaw },
    { data: allResidentsRaw },
  ] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', user!.id).single(),
    supabase
      .from('care_notes')
      .select('*, profiles(full_name)')
      .eq('resident_id', params.id)
      .order('note_date', { ascending: false })
      .limit(20),
    supabase
      .from('residents')
      .select('id, full_name')
      .eq('status', 'active')
      .order('full_name', { ascending: true }),
  ])

  const profile = profileData as { role: string } | null
  const isAdmin = isElevated(profile?.role)

  const residentList = (allResidentsRaw ?? []) as { id: string; full_name: string }[]
  const currentIdx = residentList.findIndex(r => r.id === params.id)
  const prevResident = currentIdx > 0 ? residentList[currentIdx - 1] : null
  const nextResident = currentIdx < residentList.length - 1 ? residentList[currentIdx + 1] : null

  const addNoteHref = `/care-notes/new?resident=${params.id}`
  const editHref = `/residents/${params.id}/edit`

  return (
    <>
      <Header
        title={resident.full_name}
        action={
          <div className="flex items-center gap-2">
            {/* ‹ X/Y › navigator */}
            <div className="flex items-center rounded-lg border border-gray-200 overflow-hidden">
              {prevResident ? (
                <Link
                  href={`/residents/${prevResident.id}`}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors border-r border-gray-200"
                  title={prevResident.full_name}
                >
                  ‹
                </Link>
              ) : (
                <span className="px-3 py-1.5 text-sm text-gray-300 border-r border-gray-200 cursor-not-allowed">‹</span>
              )}
              <span className="px-2.5 py-1.5 text-xs text-gray-400 tabular-nums">
                {currentIdx + 1} / {residentList.length}
              </span>
              {nextResident ? (
                <Link
                  href={`/residents/${nextResident.id}`}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors border-l border-gray-200"
                  title={nextResident.full_name}
                >
                  ›
                </Link>
              ) : (
                <span className="px-3 py-1.5 text-sm text-gray-300 border-l border-gray-200 cursor-not-allowed">›</span>
              )}
            </div>
            <Link href={`/residents/${params.id}/statement?month=${currentMonth}`}>
              <Button variant="outline" size="sm">
                <Receipt className="w-4 h-4" /> Statement
              </Button>
            </Link>
            <Link href={addNoteHref}>
              <Button variant="outline" size="sm">
                <ClipboardList className="w-4 h-4" /> Add Note
              </Button>
            </Link>
            {isAdmin && resident.status === 'active' && (
              <DischargeButton residentId={params.id} residentName={resident.full_name} />
            )}
            {isAdmin && (
              <Link href={editHref}>
                <Button size="sm">
                  <Edit className="w-4 h-4" /> Edit
                </Button>
              </Link>
            )}
          </div>
        }
      />

      <main className="flex-1 p-6 space-y-6">

        <ResidentKeyboardNav
          prevHref={prevResident ? `/residents/${prevResident.id}` : null}
          nextHref={nextResident ? `/residents/${nextResident.id}` : null}
          editHref={editHref}
          addNoteHref={addNoteHref}
          newHref="/residents/new"
          backHref="/residents"
        />

        {/* Keyboard shortcut hints */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400 select-none">
          <span><kbd className="font-mono bg-gray-100 border border-gray-200 rounded px-1">E</kbd> Edit</span>
          <span><kbd className="font-mono bg-gray-100 border border-gray-200 rounded px-1">N</kbd> Add note</span>
          <span><kbd className="font-mono bg-gray-100 border border-gray-200 rounded px-1">A</kbd> Add new</span>
          <span><kbd className="font-mono bg-gray-100 border border-gray-200 rounded px-1">Esc</kbd> Back to list</span>
          {prevResident && <span><kbd className="font-mono bg-gray-100 border border-gray-200 rounded px-1">←</kbd> {prevResident.full_name}</span>}
          {nextResident && <span><kbd className="font-mono bg-gray-100 border border-gray-200 rounded px-1">→</kbd> {nextResident.full_name}</span>}
        </div>

        {/* Profile header */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center flex-shrink-0">
              <span className="text-blue-700 font-bold text-2xl">
                {resident.full_name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h2 className="text-xl font-bold text-gray-900">{resident.full_name}</h2>
                <StatusBadge status={resident.status} />
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-gray-500">
                {resident.nric && <span className="font-mono">{resident.nric}</span>}
                {(resident.date_of_birth || resident.gender) && (
                  <span>
                    {ageFromDob(resident.date_of_birth)}
                    {resident.gender ? `/ ${resident.gender === 'male' ? 'M' : 'F'}` : ''}
                  </span>
                )}
                {resident.condition && (
                  <span>{CONDITION_LABEL[resident.condition] ?? resident.condition}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ── Details ── */}
          <SectionCard title="Details">
            <InfoRow label="NRIC" value={<span className="font-mono">{resident.nric}</span>} />
            <InfoRow label="Date of Birth" value={formatDate(resident.date_of_birth)} />
            <InfoRow label="Age" value={ageFromDob(resident.date_of_birth)} />
            <InfoRow
              label="Gender"
              value={resident.gender ? resident.gender.charAt(0).toUpperCase() + resident.gender.slice(1) : null}
            />
            <InfoRow
              label="Condition"
              value={resident.condition ? CONDITION_LABEL[resident.condition] : null}
            />
            <InfoRow label="Address" value={resident.address} />
            <InfoRow label="Admission" value={formatDate(resident.admission_date)} />
            {resident.date_of_discharge && (
              <InfoRow label="Discharge" value={formatDate(resident.date_of_discharge)} />
            )}
          </SectionCard>

          {/* ── Package ── */}
          <SectionCard title="Package">
            <InfoRow
              label="Physiotherapy"
              value={resident.physio ? (PHYSIO_LABEL[resident.physio] ?? resident.physio) : 'No'}
            />
            {resident.physio_remark && (
              <InfoRow label="Physio Remark" value={resident.physio_remark} />
            )}
            <InfoRow
              label="Caregiver"
              value={(resident as { workers?: { name: string } | null }).workers?.name ?? null}
            />
            <InfoRow
              label="Include Misc"
              value={resident.include_misc === true ? 'Yes' : resident.include_misc === false ? 'No' : null}
            />
            <InfoRow
              label="Pay Day"
              value={resident.pay_day != null ? `Day ${resident.pay_day}` : null}
            />
            <InfoRow
              label="Fee"
              value={resident.fee != null ? `RM ${Number(resident.fee).toFixed(2)}` : null}
            />
            {resident.package_remark && (
              <InfoRow label="Package Remark" value={resident.package_remark} />
            )}
          </SectionCard>

          {/* ── Health Condition ── */}
          <SectionCard title="Health Condition">
            {resident.health_condition ? (
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{resident.health_condition}</p>
            ) : (
              <p className="text-sm text-gray-400">No health condition recorded.</p>
            )}
            {resident.health_remark && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Remark</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{resident.health_remark}</p>
              </div>
            )}
          </SectionCard>

          {/* ── Care Notes ── */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Care Notes</h3>
              <Link
                href={`/residents/${params.id}/care-notes`}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                View all
              </Link>
            </div>
            <CareNoteList
              notes={(careNotesRaw ?? []) as Parameters<typeof CareNoteList>[0]['notes']}
              isAdmin={isAdmin}
              residentId={params.id}
            />
          </div>

        </div>


      </main>
    </>
  )
}
