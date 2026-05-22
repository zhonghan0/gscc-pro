'use client'

import { useState, useEffect, useTransition, useRef } from 'react'
import { GripVertical, Plus, Pencil, Trash2, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createChargeItem, updateChargeItem, deleteChargeItem } from '@/actions/extra-charges'

interface ChargeItem {
  id: string
  name: string
  default_price: number
  sort_order: number
}

export function ChargeItemsManager({ items }: { items: ChargeItem[] }) {
  const [localItems, setLocalItems] = useState(items)
  useEffect(() => { setLocalItems(items) }, [items])

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editPrice, setEditPrice] = useState('')
  const [adding, setAdding] = useState(false)
  const [addName, setAddName] = useState('')
  const [addPrice, setAddPrice] = useState('')
  const [error, setError] = useState('')
  const [, startTransition] = useTransition()

  // Drag state
  const dragIndexRef = useRef<number | null>(null)
  const [dragOver, setDragOver] = useState<number | null>(null)

  // ── Drag handlers ──────────────────────────────────────────────────────
  function handleDragStart(e: React.DragEvent, index: number) {
    dragIndexRef.current = index
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    const from = dragIndexRef.current
    if (from === null || from === index) { setDragOver(index); return }
    // Reorder locally as the user drags
    setLocalItems(prev => {
      const next = [...prev]
      const [item] = next.splice(from, 1)
      next.splice(index, 0, item)
      dragIndexRef.current = index
      return next
    })
    setDragOver(index)
  }

  function handleDrop() {
    setDragOver(null)
    dragIndexRef.current = null
    // Persist new sort_order for all items
    startTransition(async () => {
      try {
        await Promise.all(
          localItems.map((item, idx) =>
            updateChargeItem(item.id, {
              name: item.name,
              default_price: item.default_price,
              sort_order: idx,
            })
          )
        )
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not save order')
      }
    })
  }

  function handleDragEnd() {
    setDragOver(null)
    dragIndexRef.current = null
  }

  // ── Edit ───────────────────────────────────────────────────────────────
  function startEdit(item: ChargeItem) {
    setAdding(false)
    setEditingId(item.id)
    setEditName(item.name)
    setEditPrice(item.default_price.toString())
    setError('')
  }

  function cancelEdit() {
    setEditingId(null)
    setError('')
  }

  function saveEdit(id: string) {
    if (!editName.trim()) { setError('Name is required'); return }
    const price = parseFloat(editPrice)
    if (isNaN(price) || price < 0) { setError('Price must be ≥ 0'); return }
    startTransition(async () => {
      try {
        const idx = localItems.findIndex(i => i.id === id)
        await updateChargeItem(id, {
          name: editName.trim(),
          default_price: price,
          sort_order: idx,
        })
        setEditingId(null)
        setError('')
      } catch (e) { setError(e instanceof Error ? e.message : 'Error') }
    })
  }

  // ── Add ────────────────────────────────────────────────────────────────
  function startAdd() {
    setEditingId(null)
    setAdding(true)
    setAddName('')
    setAddPrice('')
    setError('')
  }

  function cancelAdd() {
    setAdding(false)
    setError('')
  }

  function saveAdd() {
    if (!addName.trim()) { setError('Name is required'); return }
    const price = parseFloat(addPrice)
    if (isNaN(price) || price < 0) { setError('Price must be ≥ 0'); return }
    startTransition(async () => {
      try {
        await createChargeItem({
          name: addName.trim(),
          default_price: price,
          sort_order: localItems.length,
        })
        setAdding(false)
        setError('')
      } catch (e) { setError(e instanceof Error ? e.message : 'Error') }
    })
  }

  // ── Delete ─────────────────────────────────────────────────────────────
  function handleDelete(id: string) {
    startTransition(async () => {
      try { await deleteChargeItem(id) }
      catch (e) { setError(e instanceof Error ? e.message : 'Error') }
    })
  }

  const fieldClass = 'h-8 text-sm px-2'

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          Preset items for billing. Drag <GripVertical className="inline w-3.5 h-3.5 text-gray-400" /> to reorder.
          Residents can have custom prices set per item.
        </p>
        <Button size="sm" onClick={startAdd} disabled={adding}>
          <Plus className="w-4 h-4" /> Add Item
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="w-8" />
              <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 w-36">Default Price</th>
              <th className="w-20" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {localItems.map((item, idx) => {
              const isEditing = editingId === item.id
              const isDragTarget = dragOver === idx
              return (
                <tr
                  key={item.id}
                  draggable={!isEditing}
                  onDragStart={e => handleDragStart(e, idx)}
                  onDragOver={e => handleDragOver(e, idx)}
                  onDrop={handleDrop}
                  onDragEnd={handleDragEnd}
                  className={
                    isEditing
                      ? 'bg-blue-50'
                      : isDragTarget
                        ? 'bg-blue-50/60 border-t-2 border-blue-400'
                        : 'hover:bg-gray-50'
                  }
                >
                  {/* Drag handle */}
                  <td className="px-2 py-3 text-center">
                    {!isEditing && (
                      <span className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 inline-flex">
                        <GripVertical className="w-4 h-4" />
                      </span>
                    )}
                  </td>

                  {isEditing ? (
                    <>
                      <td className="px-3 py-2">
                        <Input
                          className={fieldClass}
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          autoFocus
                          onKeyDown={e => { if (e.key === 'Enter') saveEdit(item.id); if (e.key === 'Escape') cancelEdit() }}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          className={fieldClass}
                          type="number"
                          min="0"
                          step="0.01"
                          value={editPrice}
                          onChange={e => setEditPrice(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') saveEdit(item.id); if (e.key === 'Escape') cancelEdit() }}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1">
                          <button onClick={() => saveEdit(item.id)} className="p-1 text-green-600 hover:bg-green-50 rounded"><Check className="w-4 h-4" /></button>
                          <button onClick={cancelEdit} className="p-1 text-gray-400 hover:bg-gray-100 rounded"><X className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 font-medium text-gray-900">{item.name}</td>
                      <td className="px-4 py-3 text-gray-700">RM {Number(item.default_price).toFixed(2)}</td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1">
                          <button onClick={() => startEdit(item)} className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleDelete(item.id)} className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              )
            })}

            {/* Add row */}
            {adding && (
              <tr className="bg-green-50">
                <td />
                <td className="px-3 py-2">
                  <Input
                    className={fieldClass}
                    placeholder="Item name"
                    value={addName}
                    onChange={e => setAddName(e.target.value)}
                    autoFocus
                    onKeyDown={e => { if (e.key === 'Enter') saveAdd(); if (e.key === 'Escape') cancelAdd() }}
                  />
                </td>
                <td className="px-3 py-2">
                  <Input
                    className={fieldClass}
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={addPrice}
                    onChange={e => setAddPrice(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveAdd(); if (e.key === 'Escape') cancelAdd() }}
                  />
                </td>
                <td className="px-3 py-2">
                  <div className="flex gap-1">
                    <button onClick={saveAdd} className="p-1 text-green-600 hover:bg-green-100 rounded"><Check className="w-4 h-4" /></button>
                    <button onClick={cancelAdd} className="p-1 text-gray-400 hover:bg-gray-100 rounded"><X className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            )}

            {localItems.length === 0 && !adding && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-sm text-gray-400">
                  No charge items yet. Click "Add Item" to create one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
