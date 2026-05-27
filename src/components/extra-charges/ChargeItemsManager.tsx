'use client'

import { useState, useEffect, useTransition, useMemo } from 'react'
import { ArrowDownAZ, Layers, Plus, Pencil, Trash2, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createChargeItem, updateChargeItem, deleteChargeItem } from '@/actions/extra-charges'
import {
  type ChargeItemSortBy,
  CHARGE_ITEM_SORT_KEY,
  sortChargeItems,
  getStoredSort,
  setStoredSort,
} from '@/lib/charge-item-sort'

const CATEGORIES = ['Transportation', 'Clinic Bills', 'Medicines', 'Groceries', 'Services', 'Refund', 'Others'] as const
type Category = typeof CATEGORIES[number]

const CATEGORY_COLOR: Record<Category, string> = {
  'Transportation': 'bg-blue-100 text-blue-700',
  'Clinic Bills':   'bg-red-100 text-red-700',
  'Medicines':      'bg-purple-100 text-purple-700',
  'Groceries':      'bg-green-100 text-green-700',
  'Services':       'bg-orange-100 text-orange-700',
  'Refund':         'bg-teal-100 text-teal-700',
  'Others':         'bg-gray-100 text-gray-600',
}

const CATEGORY_KEYWORDS: { category: Category; keywords: string[] }[] = [
  { category: 'Refund',         keywords: ['refund', 'credit', 'rebate', 'reimburse', 'return', 'discount', 'waive', 'waiver'] },
  { category: 'Transportation', keywords: ['transport', 'taxi', 'grab', 'uber', 'car', 'van', 'ambulance', 'trip', 'travel', 'bus', 'ride', 'driver', 'toll'] },
  { category: 'Clinic Bills',   keywords: ['clinic', 'hospital', 'doctor', 'medical', 'consultation', 'specialist', 'ward', 'emergency', 'health', 'appointment'] },
  { category: 'Medicines',      keywords: ['medicine', 'drug', 'medication', 'tablet', 'capsule', 'syrup', 'pill', 'pharmacy', 'supplement', 'vitamin', 'injection'] },
  { category: 'Groceries',      keywords: ['grocery', 'groceries', 'food', 'market', 'vegetable', 'fruit', 'rice', 'bread', 'milk', 'diaper', 'pamper', 'pad'] },
  { category: 'Services',       keywords: ['service', 'laundry', 'cleaning', 'clean', 'haircut', 'barber', 'salon', 'massage', 'physiotherapy', 'physio', 'nursing', 'escort'] },
]

function detectCategory(name: string): Category | null {
  const lower = name.toLowerCase()
  for (const { category, keywords } of CATEGORY_KEYWORDS) {
    if (keywords.some(kw => lower.includes(kw))) return category
  }
  return null
}

interface ChargeItem {
  id: string
  name: string
  default_price: number
  sort_order: number
  category: string | null
}

export function ChargeItemsManager({ items }: { items: ChargeItem[] }) {
  const [localItems, setLocalItems] = useState(items)
  useEffect(() => { setLocalItems(items) }, [items])

  const [sortBy, setSortBy] = useState<ChargeItemSortBy>('category')
  useEffect(() => { setSortBy(getStoredSort()) }, [])

  const displayItems = useMemo(() => sortChargeItems(localItems, sortBy), [localItems, sortBy])

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editPrice, setEditPrice] = useState('')
  const [editCategory, setEditCategory] = useState<Category>('Others')
  const [adding, setAdding] = useState(false)
  const [addName, setAddName] = useState('')
  const [addPrice, setAddPrice] = useState('')
  const [addCategory, setAddCategory] = useState<Category>('Others')
  const [error, setError] = useState('')
  const [, startTransition] = useTransition()

  // Keyboard shortcut: A to add
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.key === 'a' || e.key === 'A') { e.preventDefault(); startAdd() }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [adding, editingId])

  function toggleSort() {
    const next: ChargeItemSortBy = sortBy === 'category' ? 'name' : 'category'
    setSortBy(next)
    setStoredSort(next)
  }

  // ── Edit ───────────────────────────────────────────────────────────────
  function startEdit(item: ChargeItem) {
    setAdding(false)
    setEditingId(item.id)
    setEditName(item.name)
    setEditPrice(item.default_price.toString())
    setEditCategory((item.category as Category) || 'Others')
    setError('')
  }

  function cancelEdit() {
    setEditingId(null)
    setError('')
  }

  function saveEdit(id: string) {
    if (!editName.trim()) { setError('Name is required'); return }
    const price = editPrice.trim() === '' ? 0 : parseFloat(editPrice)
    if (isNaN(price)) { setError('Invalid price'); return }
    startTransition(async () => {
      try {
        const idx = localItems.findIndex(i => i.id === id)
        await updateChargeItem(id, {
          name: editName.trim(),
          default_price: price,
          sort_order: idx,
          category: editCategory,
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
    setAddCategory('Others')
    setError('')
  }

  function cancelAdd() {
    setAdding(false)
    setError('')
  }

  function saveAdd() {
    if (!addName.trim()) { setError('Name is required'); return }
    const price = addPrice.trim() === '' ? 0 : parseFloat(addPrice)
    if (isNaN(price)) { setError('Invalid price'); return }
    startTransition(async () => {
      try {
        await createChargeItem({
          name: addName.trim(),
          default_price: price,
          sort_order: localItems.length,
          category: addCategory,
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
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-gray-500">
          Preset items for billing. Residents can have custom prices set per item.
        </p>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Sort toggle */}
          <button
            onClick={toggleSort}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors"
            title={sortBy === 'category' ? 'Currently sorted by category' : 'Currently sorted by name'}
          >
            {sortBy === 'category'
              ? <><Layers className="w-3.5 h-3.5" /> Category</>
              : <><ArrowDownAZ className="w-3.5 h-3.5" /> Name</>
            }
          </button>
          <Button size="sm" onClick={startAdd} disabled={adding}>
            <Plus className="w-4 h-4" /> Add Item
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Category</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 w-36">Default Price</th>
              <th className="w-20" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {displayItems.map((item) => {
              const isEditing = editingId === item.id
              return (
                <tr
                  key={item.id}
                  className={isEditing ? 'bg-blue-50' : 'hover:bg-gray-50'}
                >
                  {isEditing ? (
                    <>
                      <td className="px-3 py-2">
                        <Input
                          className={fieldClass}
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          autoFocus
                          onBlur={() => {
                            const detected = detectCategory(editName)
                            if (detected) {
                              setEditCategory(detected)
                              if (detected === 'Transportation' && (!editPrice || parseFloat(editPrice) === 0)) {
                                setEditPrice('100')
                              }
                            }
                          }}
                          onKeyDown={e => { if (e.key === 'Enter') saveEdit(item.id); if (e.key === 'Escape') cancelEdit() }}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <select
                          className="h-8 text-sm px-2 rounded-md border border-gray-300 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                          value={editCategory}
                          onChange={e => setEditCategory(e.target.value as Category)}
                          onKeyDown={e => { if (e.key === 'Enter') saveEdit(item.id); if (e.key === 'Escape') cancelEdit() }}
                        >
                          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          className={fieldClass}
                          type="number"
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
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${CATEGORY_COLOR[(item.category as Category) || 'Others']}`}>
                          {item.category || 'Others'}
                        </span>
                      </td>
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
                <td className="px-3 py-2">
                  <Input
                    className={fieldClass}
                    placeholder="Item name"
                    value={addName}
                    onChange={e => setAddName(e.target.value)}
                    autoFocus
                    onBlur={() => {
                      const detected = detectCategory(addName)
                      if (detected) {
                        setAddCategory(detected)
                        if (detected === 'Transportation' && (!addPrice || parseFloat(addPrice) === 0)) {
                          setAddPrice('100')
                        }
                      }
                    }}
                    onKeyDown={e => { if (e.key === 'Enter') saveAdd(); if (e.key === 'Escape') cancelAdd() }}
                  />
                </td>
                <td className="px-3 py-2">
                  <select
                    className="h-8 text-sm px-2 rounded-md border border-gray-300 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    value={addCategory}
                    onChange={e => setAddCategory(e.target.value as Category)}
                    onKeyDown={e => { if (e.key === 'Enter') saveAdd(); if (e.key === 'Escape') cancelAdd() }}
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <Input
                    className={fieldClass}
                    type="number"
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
                  No charge items yet. Press A or click "Add Item" to create one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
