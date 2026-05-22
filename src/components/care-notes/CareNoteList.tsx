import type { CareNoteWithAuthor } from '@/lib/types'
import { CareNoteCard } from './CareNoteCard'

interface CareNoteListProps {
  notes: CareNoteWithAuthor[]
  isAdmin: boolean
  residentId: string
}

export function CareNoteList({ notes, isAdmin, residentId }: CareNoteListProps) {
  if (notes.length === 0) {
    return (
      <p className="text-sm text-gray-400 py-4 text-center">
        No care notes recorded yet.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {notes.map(note => (
        <CareNoteCard
          key={note.id}
          note={note}
          isAdmin={isAdmin}
          residentId={residentId}
        />
      ))}
    </div>
  )
}
