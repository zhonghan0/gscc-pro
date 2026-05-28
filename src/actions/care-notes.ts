import { isElevated } from '@/lib/permissions'
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

const careNoteSchema = z.object({
  resident_id: z.string().uuid('Select a resident'),
  note_text: z.string().min(1, 'Note cannot be empty'),
  note_date: z.string().min(1, 'Date is required'),
})

export async function createCareNote(formData: unknown) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const parsed = careNoteSchema.parse(formData)

  const { error } = await supabase.from('care_notes').insert({
    resident_id: parsed.resident_id,
    note_text: parsed.note_text,
    note_date: parsed.note_date,
    author_id: user.id,
  })

  if (error) throw new Error(error.message)

  revalidatePath('/care-notes')
  revalidatePath(`/residents/${parsed.resident_id}/care-notes`)
  redirect('/care-notes')
}

export async function updateCareNote(noteId: string, formData: unknown) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const parsed = careNoteSchema.parse(formData)

  const { error } = await supabase.from('care_notes').update({
    note_text: parsed.note_text,
    note_date: parsed.note_date,
  }).eq('id', noteId)

  if (error) throw new Error(error.message)

  revalidatePath('/care-notes')
  revalidatePath(`/residents/${parsed.resident_id}/care-notes`)
  redirect('/care-notes')
}

export async function deleteCareNote(noteId: string, residentId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Only admins can delete
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!isElevated(profile?.role)) throw new Error('Unauthorized')

  await supabase.from('care_notes').delete().eq('id', noteId)
  revalidatePath('/care-notes')
  revalidatePath(`/residents/${residentId}/care-notes`)
}
