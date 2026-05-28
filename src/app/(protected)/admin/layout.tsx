import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isElevated } from '@/lib/permissions'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  // Owner and Manager can access admin section
  if (!isElevated(profile?.role)) redirect('/dashboard')

  return <>{children}</>
}
