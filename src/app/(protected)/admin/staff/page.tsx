import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { StaffTable } from '@/components/admin/StaffTable'
import { Button } from '@/components/ui/button'
import { UserPlus } from 'lucide-react'

export default async function StaffPage() {
  const supabase = createClient()

  const [{ data: staff }, { data: { user } }] = await Promise.all([
    supabase.from('profiles').select('*').order('created_at'),
    supabase.auth.getUser(),
  ])

  return (
    <>
      <Header
        title="Staff Management"
        action={
          <Link href="/admin/staff/invite">
            <Button size="sm">
              <UserPlus className="w-4 h-4" /> Add Staff
            </Button>
          </Link>
        }
      />
      <main className="flex-1 p-6 space-y-4">
        <p className="text-sm text-gray-500">{staff?.length ?? 0} accounts</p>
        <StaffTable staff={staff ?? []} currentUserId={user!.id} />
      </main>
    </>
  )
}
