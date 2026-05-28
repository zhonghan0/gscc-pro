import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { isElevated } from '@/lib/permissions'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'
import { Edit } from 'lucide-react'
import type { WorkerWithPosition } from '@/lib/types'
import { WorkerKeyboardNav } from '@/components/workers/WorkerKeyboardNav'

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-0.5 sm:gap-4 py-2.5 border-b border-gray-100 last:border-0">
      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide sm:w-40 flex-shrink-0">{label}</span>
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

function yearsOfWork(start: string | null): string {
  if (!start) return '—'
  const ms = Date.now() - new Date(start).getTime()
  const years = Math.floor(ms / (365.25 * 24 * 3600 * 1000))
  const months = Math.floor((ms % (365.25 * 24 * 3600 * 1000)) / (30.44 * 24 * 3600 * 1000))
  if (years === 0) return `${months} month${months !== 1 ? 's' : ''}`
  if (months === 0) return `${years} year${years !== 1 ? 's' : ''}`
  return `${years} year${years !== 1 ? 's' : ''} ${months} month${months !== 1 ? 's' : ''}`
}

export default async function WorkerProfilePage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single()
  if (!isElevated(profile?.role)) redirect('/dashboard')

  const { data: workerRaw } = await supabase
    .from('workers').select('*, positions(name)').eq('id', params.id).single()

  if (!workerRaw) notFound()
  const worker = workerRaw as unknown as WorkerWithPosition

  const { data: allWorkers } = await supabase
    .from('workers')
    .select('id, name, nickname')
    .eq('worker_type', worker.worker_type)
    .order('name', { ascending: true })

  const workerList = allWorkers ?? []
  const currentIdx = workerList.findIndex(w => w.id === params.id)
  const prevWorker = currentIdx > 0 ? workerList[currentIdx - 1] : null
  const nextWorker = currentIdx < workerList.length - 1 ? workerList[currentIdx + 1] : null

  const isLocal = worker.worker_type === 'local'
  const backHref = isLocal ? '/admin/local-workers' : '/admin/caregivers'
  const age = worker.date_of_birth
    ? Math.floor((Date.now() - new Date(worker.date_of_birth).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null

  return (
    <>
      <Header
        title={worker.name}
        action={
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-lg border border-gray-200 overflow-hidden">
              {prevWorker ? (
                <Link
                  href={`/admin/workers/${prevWorker.id}`}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors border-r border-gray-200"
                  title={(prevWorker as { nickname?: string | null; name: string }).nickname || prevWorker.name}
                >
                  ‹
                </Link>
              ) : (
                <span className="px-3 py-1.5 text-sm text-gray-300 border-r border-gray-200 cursor-not-allowed">‹</span>
              )}
              <span className="px-2.5 py-1.5 text-xs text-gray-400 tabular-nums">
                {currentIdx + 1} / {workerList.length}
              </span>
              {nextWorker ? (
                <Link
                  href={`/admin/workers/${nextWorker.id}`}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors border-l border-gray-200"
                  title={(nextWorker as { nickname?: string | null; name: string }).nickname || nextWorker.name}
                >
                  ›
                </Link>
              ) : (
                <span className="px-3 py-1.5 text-sm text-gray-300 border-l border-gray-200 cursor-not-allowed">›</span>
              )}
            </div>
            <Link href={`/admin/workers/${params.id}/edit`}>
              <Button size="sm"><Edit className="w-4 h-4" /> Edit</Button>
            </Link>
          </div>
        }
      />
      <main className="flex-1 p-6 space-y-6">
        <WorkerKeyboardNav
          prevHref={prevWorker ? `/admin/workers/${prevWorker.id}` : null}
          nextHref={nextWorker ? `/admin/workers/${nextWorker.id}` : null}
          editHref={`/admin/workers/${params.id}/edit`}
          newHref="/admin/workers/new"
          backHref={backHref}
        />

        {/* Keyboard shortcut hints */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400 select-none">
          <span><kbd className="font-mono bg-gray-100 border border-gray-200 rounded px-1">E</kbd> Edit</span>
          <span><kbd className="font-mono bg-gray-100 border border-gray-200 rounded px-1">A</kbd> Add new</span>
          <span><kbd className="font-mono bg-gray-100 border border-gray-200 rounded px-1">Esc</kbd> Back to list</span>
          {prevWorker && <span><kbd className="font-mono bg-gray-100 border border-gray-200 rounded px-1">←</kbd> {(prevWorker as { nickname?: string | null; name: string }).nickname || prevWorker.name}</span>}
          {nextWorker && <span><kbd className="font-mono bg-gray-100 border border-gray-200 rounded px-1">→</kbd> {(nextWorker as { nickname?: string | null; name: string }).nickname || nextWorker.name}</span>}
        </div>

        {/* Header card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
              <span className="text-indigo-700 font-bold text-2xl">{worker.name.charAt(0).toUpperCase()}</span>
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h2 className="text-xl font-bold text-gray-900">{worker.name}</h2>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  worker.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                }`}>{worker.status}</span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  isLocal ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                }`}>
                  {isLocal ? '🇲🇾 Local' : '🌏 Foreign'}
                </span>
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-gray-500">
                {worker.positions?.name && <span>{worker.positions.name}</span>}
                {age !== null && <span>{age} years old</span>}
                {worker.gender && <span className="capitalize">{worker.gender}</span>}
                {worker.date_start_work && <span>Serving {yearsOfWork(worker.date_start_work)}</span>}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Personal Details */}
          <SectionCard title="Personal Details">
            {isLocal ? (
              <>
                <InfoRow label="Nickname" value={worker.nickname} />
                <InfoRow label="NRIC" value={<span className="font-mono">{worker.nric}</span>} />
                <InfoRow label="Date of Birth" value={formatDate(worker.date_of_birth)} />
                <InfoRow label="Age" value={age !== null ? `${age} years old` : null} />
                <InfoRow label="Gender" value={worker.gender ? worker.gender.charAt(0).toUpperCase() + worker.gender.slice(1) : null} />
                <InfoRow label="Position" value={worker.positions?.name} />
                <InfoRow label="Contact" value={worker.contact_number} />
                <InfoRow label="Address" value={worker.address} />
              </>
            ) : (
              <>
                <InfoRow label="Nickname" value={worker.nickname} />
                <InfoRow label="Country" value={worker.country_of_origin} />
                <InfoRow label="Gender" value={worker.gender ? worker.gender.charAt(0).toUpperCase() + worker.gender.slice(1) : null} />
                <InfoRow label="Date of Birth" value={formatDate(worker.date_of_birth)} />
                <InfoRow label="Age" value={age !== null ? `${age} years old` : null} />
                <InfoRow label="Passport No." value={worker.passport_number} />
                <InfoRow label="Passport Expiry" value={formatDate(worker.passport_expiry)} />
                <InfoRow label="Permit Date" value={formatDate(worker.passport_permit_date)} />
                <InfoRow label="Typhoid Vaccine Expiry" value={formatDate(worker.typhoid_vaccine_expiry)} />
                <InfoRow label="Contact" value={worker.contact_number} />
              </>
            )}
          </SectionCard>

          {/* Employment & Payroll */}
          <SectionCard title="Employment & Payroll">
            <InfoRow label="Date Start" value={formatDate(worker.date_start_work)} />
            <InfoRow label="Date End" value={formatDate(worker.date_end_work)} />
            <InfoRow label="Years of Service" value={yearsOfWork(worker.date_start_work)} />
            <InfoRow label="Salary" value={worker.current_salary != null ? `RM ${Number(worker.current_salary).toFixed(2)}` : null} />
            {isLocal ? (
              <>
                <InfoRow label="Bank" value={worker.bank} />
                <InfoRow label="Account No." value={worker.bank_account_number} />
                <InfoRow label="KWSP / EPF" value={worker.kwsp} />
              </>
            ) : (
              <>
                <InfoRow label="Majikan" value={worker.majikan} />
                <InfoRow label="Majikan Email" value={worker.majikan_email} />
              </>
            )}
            {worker.remark && (
              <div className="pt-3 border-t border-gray-100 mt-2">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Remark</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{worker.remark}</p>
              </div>
            )}
          </SectionCard>

        </div>
      </main>
    </>
  )
}
