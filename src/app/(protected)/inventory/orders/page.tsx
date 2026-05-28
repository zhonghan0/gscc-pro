import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { canAccessInventory } from '@/lib/permissions'
import { ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default async function OrdersPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!canAccessInventory(profile?.role)) redirect('/dashboard')

  const { data: orders } = await supabase
    .from('inventory_orders')
    .select(`
      id, order_date, status, notes, created_at,
      inventory_suppliers(name),
      inventory_order_items(id, quantity, unit_price)
    `)
    .order('order_date', { ascending: false })

  return (
    <>
      <Header
        title="Orders"
        action={
          <Link href="/inventory/orders/new">
            <Button size="sm">
              <ShoppingCart className="w-4 h-4" /> New Order
            </Button>
          </Link>
        }
      />
      <main className="flex-1 p-6">
        {(!orders || orders.length === 0) ? (
          <div className="text-center py-16 text-gray-400">
            <ShoppingCart className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No orders yet</p>
            <p className="text-sm mt-1">Create your first order to get started</p>
            <Link href="/inventory/orders/new" className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
              <ShoppingCart className="w-4 h-4" /> New Order
            </Link>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-5 py-3 font-medium text-gray-600">Date</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-600">Supplier</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-600">Items</th>
                  <th className="text-right px-5 py-3 font-medium text-gray-600">Total (RM)</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.map((order: any) => {
                  const total = order.inventory_order_items?.reduce(
                    (sum: number, i: any) => sum + i.quantity * i.unit_price, 0
                  ) ?? 0
                  return (
                    <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 text-gray-700">
                        <Link href={`/inventory/orders/${order.id}`} className="hover:text-blue-600 font-medium">
                          {new Date(order.order_date).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-gray-700">{order.inventory_suppliers?.name}</td>
                      <td className="px-5 py-3 text-gray-500">{order.inventory_order_items?.length ?? 0} item(s)</td>
                      <td className="px-5 py-3 text-right font-medium text-gray-900">
                        {total.toFixed(2)}
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge status={order.status} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending:   'bg-yellow-100 text-yellow-700',
    received:  'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
  }
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${map[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  )
}
