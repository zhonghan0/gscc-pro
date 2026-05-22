'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { Resident, CareNote } from '@/lib/types'
import { createCareNote, updateCareNote } from '@/actions/care-notes'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface CareNoteFormProps {
  residents: Pick<Resident, 'id' | 'full_name'>[]
  defaultResidentId?: string
  note?: CareNote  // present when editing
  authorName?: string | null
}

export function CareNoteForm({ residents, defaultResidentId, note, authorName }: CareNoteFormProps) {
  const router = useRouter()
  const isEdit = !!note
  const [residentId, setResidentId] = useState(defaultResidentId ?? note?.resident_id ?? '')
  const [noteText, setNoteText] = useState(note?.note_text ?? '')
  const [noteDate, setNoteDate] = useState(
    note?.note_date
      ? note.note_date.slice(0, 16)
      : new Date().toISOString().slice(0, 16)
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isDirty, setDirty] = useState(false)
  const [showExitConfirm, setShowExitConfirm] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
        // allow input to handle its own Esc (blur), then intercept
        ;(e.target as HTMLElement).blur()
      }
      e.preventDefault()
      if (isDirty) setShowExitConfirm(true)
      else router.back()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isDirty, router])

  function handleCancel() {
    if (isDirty) setShowExitConfirm(true)
    else router.back()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!residentId) { setError('Please select a resident'); return }
    setLoading(true)
    setError('')

    try {
      if (isEdit) {
        await updateCareNote(note.id, { resident_id: residentId, note_text: noteText, note_date: noteDate })
      } else {
        await createCareNote({ resident_id: residentId, note_text: noteText, note_date: noteDate })
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  return (
    <>
    {showExitConfirm && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4 space-y-4">
          <h2 className="font-semibold text-gray-900">Unsaved changes</h2>
          <p className="text-sm text-gray-600">You have unsaved changes. What would you like to do?</p>
          <div className="flex flex-col gap-2">
            <Button type="button" onClick={() => { setShowExitConfirm(false); formRef.current?.requestSubmit() }}>
              Save changes
            </Button>
            <Button type="button" variant="outline" onClick={() => { setShowExitConfirm(false); router.back() }}>
              Discard &amp; leave
            </Button>
            <Button type="button" variant="ghost" onClick={() => setShowExitConfirm(false)}>
              Keep editing
            </Button>
          </div>
        </div>
      </div>
    )}
    <form ref={formRef} onSubmit={handleSubmit} onChange={() => setDirty(true)} className="space-y-5">
      <div>
        <Label htmlFor="resident">Resident *</Label>
        <select
          id="resident"
          required
          value={residentId}
          onChange={e => setResidentId(e.target.value)}
          disabled={isEdit}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
        >
          <option value="">Select resident…</option>
          {residents.map(r => (
            <option key={r.id} value={r.id}>
              {r.full_name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <Label htmlFor="note_date">Date & Time *</Label>
        <Input
          id="note_date"
          type="datetime-local"
          required
          value={noteDate}
          onChange={e => setNoteDate(e.target.value)}
        />
      </div>

      <div>
        <Label htmlFor="note_text">Note *</Label>
        <Textarea
          id="note_text"
          required
          rows={6}
          value={noteText}
          onChange={e => setNoteText(e.target.value)}
          placeholder="Describe the care provided, observations, changes in condition…"
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-gray-200">
        <div className="flex items-center gap-3">
          <Button type="button" variant="ghost" onClick={handleCancel}>Cancel</Button>
          <span className="text-xs text-gray-400">Esc to cancel</span>
          {isEdit && authorName && (
            <span className="text-xs text-gray-400">· by {authorName}</span>
          )}
        </div>
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving…' : isEdit ? 'Save Changes' : 'Save Log'}
        </Button>
      </div>
    </form>
    </>
  )
}
