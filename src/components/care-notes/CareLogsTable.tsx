'use client'

import { useState, useTransition, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, Pencil, Trash2, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { deleteCareNote } from '@/actions/care-notes'
import { formatDateTime } from '@/lib/utils'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type NoteRow = any

interface Props {
  notes: NoteRow[]
  isAdmin: boolean
}

function DeleteCell({ note, isAdmin }: { note: NoteRow; isAdmin: boolean }) {
  const [confirm, setConfirm] = useState(false)
  const [pending, startTransition] = useTransition()

  if (!isAdmin) return null

  if (!confirm) {
    return (
      <button
        onClick={() => setConfirm(true)}
        className="inline-flex items-center justify-center w-7 h-7 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
        title="Delete"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    )
  }

  return (
    <span className="flex items-center gap-1 text-xs">
      <button
        disabled={pending}
        onClick={() => startTransition(() => deleteCareNote(note.id, note.resident_id))}
        className="text-red-600 hover:underline font-medium disabled:opacity-50"
      >
        {pending ? '…' : 'Yes'}
      </button>
      <span className="text-gray-300">·</span>
      <button onClick={() => setConfirm(false)} className="text-gray-500 hover:underline">No</button>
    </span>
  )
}

type SortKey = 'date' | 'resident'
type SortDir = 'asc' | 'desc'

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ArrowUpDown className="w-3.5 h-3.5 text-gray-300 ml-1 inline" />
  return sortDir === 'asc'
    ? <ArrowUp className="w-3.5 h-3.5 text-blue-500 ml-1 inline" />
    : <ArrowDown className="w-3.5 h-3.5 text-blue-500 ml-1 inline" />
}

export function CareLogsTable({ notes, isAdmin }: Props) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === 'a' || e.key === 'A') { e.preventDefault(); router.push('/care-notes/new') }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [router])

  function handleSort(col: SortKey) {
    if (col === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(col); setSortDir('asc') }
  }

  const filtered = notes
    .filter(n => {
      const q = search.toLowerCase()
      const resident = (n.residents?.full_name ?? '').toLowerCase()
      const author = (n.profiles?.full_name ?? '').toLowerCase()
      const text = (n.note_text ?? '').toLowerCase()
      return resident.includes(q) || author.includes(q) || text.includes(q)
    })
    .sort((a, b) => {
      let cmp = 0
      if (sortKey === 'date')     cmp = (a.note_date ?? '').localeCompare(b.note_date ?? '')
      else if (sortKey === 'resident') cmp = (a.residents?.full_name ?? '').localeCompare(b.residents?.full_name ?? '')
      return sortDir === 'asc' ? cmp : -cmp
    })

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Search by resident, author or note…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Keyboard hints */}
      <p className="text-xs text-gray-400 select-none">
        <kbd className="font-mono">A</kbd> Add new
      </p>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-sm text-gray-400">No care logs found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  {(['date', 'resident'] as SortKey[]).map((col, i) => (
                    <th
                      key={col}
                      onClick={() => handleSort(col)}
                      className={`text-left px-4 py-3 font-medium text-gray-600 cursor-pointer select-none whitespace-nowrap hover:text-gray-900 ${i === 1 ? 'min-w-[140px]' : ''}`}
                    >
                      {col === 'date' ? 'Date & Time' : col.charAt(0).toUpperCase() + col.slice(1)}
                      <SortIcon col={col} sortKey={sortKey} sortDir={sortDir} />
                    </th>
                  ))}
                  <th className="text-left px-4 py-3 font-medium text-gray-600 min-w-[240px]">Note</th>
                  {isAdmin && <th className="px-2 py-3 w-16" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(note => (
                  <tr key={note.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-xs">{formatDateTime(note.note_date)}</td>
                    <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{note.residents?.full_name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-700 max-w-xs">
                      <p className="line-clamp-2">{note.note_text}</p>
                    </td>
                    {isAdmin && (
                      <td className="px-2 py-3">
                        <div className="flex items-center gap-1">
                          <Link
                            href={`/care-notes/${note.id}/edit`}
                            className="inline-flex items-center justify-center w-7 h-7 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Link>
                          <DeleteCell note={note} isAdmin={isAdmin} />
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-500">{filtered.length} of {notes.length} logs</p>
    </div>
  )
}
