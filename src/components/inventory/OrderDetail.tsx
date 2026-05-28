'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft, CheckCircle, XCircle, Clock, Trash2 } from 'lucide-react'
import { updateOrderStatus, deleteOrder } from '@/actions/inventory'

type OrderDetailData = {
  id: string
  order_date: string
  status: 'pending' | 'received' | 'cancelled'
  notes: string | null
  created_at: string
  inventory_suppliers: { id: string; name: string } | null
  inventory_order_items: {
    id: string
    quantity: number
    unit_price: number
    inventory_items: { id: string; name: string; unit: string; category: string } | null
  }[]
}

const STATUS_CONFIG = {
  pending:   { label: 'Pending',   color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  received:  { label: 'Received',  color: 'bg-green-100 text-green-700',   icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700',       icon: XCircle },
}

export function OrderDetail({ order: initial, canEdit }: { order: OrderDetailData; canEdit: boolean }) {
  const [order, setOrder] = useState(initial)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const statusCfg = STATUS_CONFIG[order.status]
  const StatusIcon = statusCfg.icon

  const total = order.inventory_order_items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0)

  async function handleStatus(newStatus: 'pending' | 'received' | 'cancelled') {
    setUpdatingStatus(true)
    try {
      await updateOrderStatus(order.id, newStatus)
      setOrder(o => ({ ...o, status: newStatus }))
    } catch (err: any) {
      alert(err.message)
    }
    setUpdatingStatus(false)
  }

  async function handleDelete() {
    if (!confirm('Delete this order? This cannot be undone.')) return
    setDeleting(true)
    try {
      await deleteOrder(order.id)
    } catch (err: any) {
      if (!err.message?.includes('NEXT_REDIRECT')) {
        alert(err.message)
        setDeleting(false)
      }
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <Link href="/inventory/orders" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Orders
      </Link>

      {/* Header card */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{order.inventory_suppliers?.name}</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {new Date(order.order_date).toLocaleDateString('en-MY', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            {order.notes && <p className="text-sm text-gray-600 mt-2 italic">"{order.notes}"</p>}
          </div>
          <span className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full ${statusCfg.color}`}>
            <StatusIcon className="w-4 h-4" />
            {statusCfg.label}
          </span>
        </div>

        {/* Status actions */}
        {canEdit && (
          <div className="mt-4 flex items-center gap-2 border-t border-gray-100 pt-4">
            <span className="text-xs text-gray-500 font-medium mr-1">Mark as:</span>
            {(['pending', 'received', 'cancelled'] as const).map(s => (
              <button
                key={s}
                disabled={order.status === s || updatingStatus}
                onClick={() => handleStatus(s)}
                className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                  order.status === s
                    ? `${STATUS_CONFIG[s].color} cursor-default`
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {STATUS_CONFIG[s].label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Items */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Items</h3>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-5 py-2.5 font-medium text-gray-600">Product</th>
              <th className="text-center px-4 py-2.5 font-medium text-gray-600">Qty</th>
              <th className="text-right px-4 py-2.5 font-medium text-gray-600">Unit Price</th>
              <th className="text-right px-5 py-2.5 font-medium text-gray-600">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {order.inventory_order_items.map(item => (
              <tr key={item.id}>
                <td className="px-5 py-3">
                  <p className="font-medium text-gray-900">{item.inventory_items?.name}</p>
                  <p className="text-xs text-gray-400">per {item.inventory_items?.unit}</p>
                </td>
                <td className="px-4 py-3 text-center text-gray-700">{item.quantity}</td>
                <td className="px-4 py-3 text-right text-gray-700">RM {item.unit_price.toFixed(2)}</td>
                <td className="px-5 py-3 text-right font-medium text-gray-900">
                  RM {(item.quantity * item.unit_price).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t border-gray-200 bg-gray-50">
            <tr>
              <td colSpan={3} className="px-5 py-3 text-right font-semibold text-gray-700">Total</td>
              <td className="px-5 py-3 text-right font-bold text-gray-900 text-base">RM {total.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Danger zone */}
      {canEdit && (
        <div className="border border-red-100 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-red-700">Delete Order</p>
            <p className="text-xs text-red-400 mt-0.5">This action cannot be undone</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
            disabled={deleting}
            className="text-red-600 border-red-200 hover:bg-red-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </div>
      )}
    </div>
  )
}
