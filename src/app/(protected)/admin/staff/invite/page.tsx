import { Header } from '@/components/layout/Header'
import { InviteStaffForm } from '@/components/admin/InviteStaffForm'

export default function InviteStaffPage() {
  return (
    <>
      <Header title="Add User" />
      <main className="flex-1 p-6">
        <div className="max-w-lg mx-auto bg-white rounded-xl border border-gray-200 p-6">
          <InviteStaffForm />
        </div>
      </main>
    </>
  )
}
