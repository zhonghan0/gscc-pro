'use client'

import { useState, useTransition } from 'react'
import { Trash2 } from 'lucide-react'

interface DeleteButtonProps {
  /** What to display in the confirmation prompt, e.g. "resident Tan Ah Kow" */
  label: string
  /** Server action to call on confirm */
  action: () => Promise<void>
}

export function DeleteButton({ label, action }: DeleteButtonProps) {
  const [confirming, setConfirming] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleFirstClick() {
    setConfirming(true)
  }

  function handleCancel() {
    setConfirming(false)
  }

  function handleConfirm() {
    startTransition(async () => {
      await action()
    })
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={handleFirstClick}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50 transition-colors"
      >
        <Trash2 className="w-4 h-4" />
        Delete
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-red-600 font-medium">
        Delete {label}?
      </span>
      <button
        type="button"
        onClick={handleConfirm}
        disabled={isPending}
        className="px-3 py-1.5 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
      >
        {isPending ? 'Deleting…' : 'Yes, delete'}
      </button>
      <button
        type="button"
        onClick={handleCancel}
        disabled={isPending}
        className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 border border-gray-300 hover:bg-gray-50 transition-colors"
      >
        Cancel
      </button>
    </div>
  )
}
