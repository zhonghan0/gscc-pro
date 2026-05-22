'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  prevHref: string | null
  nextHref: string | null
  editHref: string
  addNoteHref: string
  newHref: string
  backHref: string
}

export function ResidentKeyboardNav({ prevHref, nextHref, editHref, addNoteHref, newHref, backHref }: Props) {
  const router = useRouter()

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.metaKey || e.ctrlKey || e.altKey) return

      switch (e.key) {
        case 'ArrowLeft':
          if (prevHref) { e.preventDefault(); router.push(prevHref) }
          break
        case 'ArrowRight':
          if (nextHref) { e.preventDefault(); router.push(nextHref) }
          break
        case 'e':
        case 'E':
          e.preventDefault()
          router.push(editHref)
          break
        case 'n':
        case 'N':
          e.preventDefault()
          router.push(addNoteHref)
          break
        case 'a':
        case 'A':
          e.preventDefault()
          router.push(newHref)
          break
        case 'Escape':
          e.preventDefault()
          router.push(backHref)
          break
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [prevHref, nextHref, editHref, addNoteHref, newHref, backHref, router])

  return null
}
