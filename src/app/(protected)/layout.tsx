import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/Sidebar'
import { SidebarProvider } from '@/lib/sidebar-context'

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [
    { count: residentCount },
    { count: caregiverCount },
    { count: localWorkerCount },
  ] = await Promise.all([
    supabase.from('residents').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('workers').select('*', { count: 'exact', head: true })
      .eq('worker_type', 'foreign').eq('status', 'active').not('passport_permit_date', 'is', null),
    supabase.from('workers').select('*', { count: 'exact', head: true })
      .eq('worker_type', 'local').eq('status', 'active'),
  ])

  const counts = {
    residents:   residentCount   ?? 0,
    caregivers:  caregiverCount  ?? 0,
    localWorkers: localWorkerCount ?? 0,
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-gray-50">
        <div className="hidden lg:flex flex-shrink-0">
          <Sidebar counts={counts} />
        </div>
        <div className="flex-1 flex flex-col min-w-0">
          {children}
        </div>
      </div>
    </SidebarProvider>
  )
}
