'use client'

import { useState } from 'react'
import type { CareNoteWithAuthor } from '@/lib/types'
import { formatDateTime } from '@/lib/utils'
import { deleteCareNote } from '@/actions/care-notes'
import { Trash2 } from 'lucide-react'

interface CareNoteCardProps {
  note: CareNoteWithAuthor
  isAdmin: boolean
  residentId: string
}

export function CareNoteCard({ note, isAdmin, residentId }: CareNoteCardProps) {
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!confirm('Delete this care note?')) return
    setDeleting(true)
    await deleteCareNote(note.id, residentId)
  }

  return (
    <div className="p-4 border border-gray-200 rounded-xl bg-white space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-gray-500">
            {formatDateTime(note.note_date)}
          </p>
          <p className="text-xs text-gray-400">by {note.profiles?.full_name ?? 'Staff'}</p>
        </div>
        {isAdmin && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-gray-400 hover:text-red-500 disabled:opacity-50 transition-colors flex-shrink-0"
            aria-label="Delete note"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
      <p className="text-sm text-gray-800 whitespace-pre-wrap">{note.note_text}</p>
    </div>
  )
}
