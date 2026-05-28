import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { canAccessInventory } from '@/lib/permissions'
import { Package, Building2, Tag, ShoppingCart, TrendingDown } from 'lucide-react'

export default async function InventoryPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!canAccessInventory(profile?.role)) redirect('/dashboard')

  const [
    { count: supplierCount },
    { count: itemCount },
    { count: pendingOrderCount },
    { data: recentOrders },
  ] = await Promise.all([
    supabase.from('inventory_suppliers').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('inventory_items').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('inventory_orders').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('inventory_orders')
      .select('id, order_date, status, inventory_suppliers(name)')
      .order('order_date', { ascending: false })
      .limit(5),
  ])

  const cards = [
    { label: 'Suppliers',      value: supplierCount ?? 0,      icon: Building2,   href: '/inventory/suppliers', color: 'bg-blue-50 text-blue-600' },
    { label: 'Products',       value: itemCount ?? 0,          icon: Tag,         href: '/inventory/items',     color: 'bg-green-50 text-green-600' },
    { label: 'Pending Orders', value: pendingOrderCount ?? 0,  icon: ShoppingCart,href: '/inventory/orders',    color: 'bg-orange-50 text-orange-600' },
  ]

  return (
    <>
      <Header
        title="Inventory"
        action={
          <Link href="/inventory/orders/new"
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <ShoppingCart className="w-4 h-4" /> New Order
          </Link>
        }
      />
      <main className="flex-1 p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {cards.map(({ label, value, icon: Icon, href, color }) => (
            <Link key={label} href={href}
              className="bg-white border border-gray-200 rounded-xl p-5 flex items-center gap-4 hover:shadow-sm transition-shadow">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
                <p className="text-sm text-gray-500">{label}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-2 gap-4">
          <Link href="/inventory/prices"
            className="bg-white border border-gray-200 rounded-xl p-5 flex items-center gap-4 hover:shadow-sm transition-shadow group">
            <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <TrendingDown className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">Price Comparison</p>
              <p className="text-sm text-gray-500">Compare prices across suppliers</p>
            </div>
          </Link>
          <Link href="/inventory/orders"
            className="bg-white border border-gray-200 rounded-xl p-5 flex items-center gap-4 hover:shadow-sm transition-shadow group">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">Order History</p>
              <p className="text-sm text-gray-500">All past and pending orders</p>
            </div>
          </Link>
        </div>

        {/* Recent orders */}
        {recentOrders && recentOrders.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Recent Orders</h3>
            </div>
            <div className="divide-y divide-gray-50">
              {recentOrders.map((order: any) => (
                <Link key={order.id} href={`/inventory/orders/${order.id}`}
                  className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{order.inventory_suppliers?.name}</p>
                    <p className="text-xs text-gray-500">{new Date(order.order_date).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  </div>
                  <StatusBadge status={order.status} />
                </Link>
              ))}
            </div>
            <div className="px-5 py-3 border-t border-gray-100">
              <Link href="/inventory/orders" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                View all orders →
              </Link>
            </div>
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
