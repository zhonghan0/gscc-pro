import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { StaffTable } from '@/components/admin/StaffTable'
import { Button } from '@/components/ui/button'
import { UserPlus } from 'lucide-react'
import { isOwner } from '@/lib/permissions'

export default async function StaffPage() {
  const supabase = createClient()

  const [{ data: staff }, { data: { user } }] = await Promise.all([
    supabase.from('profiles').select('*').order('created_at'),
    supabase.auth.getUser(),
  ])

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single()
  if (!isOwner(profile?.role)) redirect('/dashboard')

  return (
    <>
      <Header
        title="User Management"
        action={
          <Link href="/admin/users/invite">
            <Button size="sm">
              <UserPlus className="w-4 h-4" /> Add User
            </Button>
          </Link>
        }
      />
      <main className="flex-1 p-6 space-y-4">
        <p className="text-sm text-gray-500">{staff?.length ?? 0} accounts · click a role badge to change it</p>
        <StaffTable staff={staff ?? []} currentUserId={user!.id} currentUserEmail={user!.email ?? ''} />
      </main>
    </>
  )
}
