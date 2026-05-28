import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { formatDateTime } from '@/lib/utils'
import { Users, ClipboardList, UserCheck, HardHat } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [
    { count: activeResidents },
    { count: totalCaregivers },
    { count: totalLocalWorkers },
    { count: totalNotes },
    { data: recentNotes },
    { data: profile },
  ] = await Promise.all([
    supabase.from('residents').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('workers').select('*', { count: 'exact', head: true })
      .eq('worker_type', 'foreign')
      .eq('status', 'active')
      .not('passport_permit_date', 'is', null),
    supabase.from('workers').select('*', { count: 'exact', head: true })
      .eq('worker_type', 'local')
      .eq('status', 'active'),
    supabase.from('care_notes').select('*', { count: 'exact', head: true }),
    supabase
      .from('care_notes')
      .select('id, note_text, note_date, resident_id, profiles(full_name), residents(full_name)')
      .order('note_date', { ascending: false })
      .limit(5),
    supabase.from('profiles').select('full_name, role').eq('id', user!.id).single(),
  ])

  const stats = [
    { label: 'Total Residents', value: activeResidents ?? 0, icon: Users, color: 'bg-blue-50 text-blue-700', href: '/residents' },
    { label: 'Caregiver', value: totalCaregivers ?? 0, icon: UserCheck, color: 'bg-orange-50 text-orange-700', href: '/admin/caregivers' },
    { label: 'Local Worker', value: totalLocalWorkers ?? 0, icon: HardHat, color: 'bg-green-50 text-green-700', href: '/admin/local-workers' },
    { label: 'Care Notes', value: totalNotes ?? 0, icon: ClipboardList, color: 'bg-purple-50 text-purple-700', href: '/care-notes' },
  ]

  return (
    <>
      <Header title="Dashboard" />
      <main className="flex-1 p-6 space-y-6">

        {/* Welcome */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Welcome back, {profile?.full_name?.split(' ')[0] ?? 'there'} 👋
          </h2>
          <p className="text-sm text-gray-500 capitalize">{profile?.role} · Care Pro</p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map(({ label, value, icon: Icon, color, href }) => (
            <Link
              key={label}
              href={href}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:border-blue-300 hover:shadow-sm transition-all group"
            >
              <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center mb-3 group-hover:opacity-80 transition-opacity`}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              <p className="text-sm text-gray-500">{label}</p>
            </Link>
          ))}
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            href="/residents"
            className="bg-white rounded-xl border border-gray-200 p-5 hover:border-blue-300 hover:shadow-sm transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="font-medium text-gray-900">View Residents</p>
                <p className="text-sm text-gray-500">Browse the full name list</p>
              </div>
            </div>
          </Link>
          <Link
            href="/care-notes/new"
            className="bg-white rounded-xl border border-gray-200 p-5 hover:border-blue-300 hover:shadow-sm transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center group-hover:bg-purple-100 transition-colors">
                <ClipboardList className="w-5 h-5" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Add Care Note</p>
                <p className="text-sm text-gray-500">Log today&apos;s care activity</p>
              </div>
            </div>
          </Link>
        </div>

        {/* Recent care notes */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Recent Care Notes</h3>
          {!recentNotes?.length ? (
            <p className="text-sm text-gray-400">No care notes recorded yet.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {recentNotes.map((note: {
                id: string
                note_text: string
                note_date: string
                resident_id: string
                profiles: { full_name: string } | null
                residents: { full_name: string } | null
              }) => (
                <div key={note.id} className="py-3 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <ClipboardList className="w-4 h-4 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        href={`/residents/${note.resident_id}`}
                        className="text-sm font-medium text-gray-900 hover:text-blue-600"
                      >
                        {(note.residents as { full_name: string } | null)?.full_name ?? 'Unknown'}
                      </Link>
                      <span className="text-xs text-gray-400">
                        by {(note.profiles as { full_name: string } | null)?.full_name ?? 'Staff'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 truncate">{note.note_text}</p>
                    <p className="text-xs text-gray-400">{formatDateTime(note.note_date)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </main>
    </>
  )
}
