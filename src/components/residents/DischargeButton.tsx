'use client'

import { useState, useTransition } from 'react'
import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { dischargeResident } from '@/actions/residents'

interface Props {
  residentId: string
  residentName: string
}

export function DischargeButton({ residentId, residentName }: Props) {
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleOpen() {
    setDate(new Date().toISOString().slice(0, 10))
    setError('')
    setOpen(true)
  }

  function handleConfirm() {
    if (!date) { setError('Please select a discharge date.'); return }
    setError('')
    startTransition(async () => {
      try {
        await dischargeResident(residentId, date)
        setOpen(false)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong')
      }
    })
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={handleOpen}
        className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 hover:border-red-300">
        <LogOut className="w-4 h-4" />
        Discharge
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4">
            <div>
              <h3 className="text-base font-semibold text-gray-900">Discharge Resident</h3>
              <p className="text-sm text-gray-500 mt-1">
                Set the discharge date for <span className="font-medium text-gray-800">{residentName}</span>.
                This will mark them as discharged.
              </p>
            </div>

            <div>
              <Label htmlFor="discharge_date">Discharge Date</Label>
              <Input
                id="discharge_date"
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="mt-1"
                autoFocus
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
            )}

            <div className="flex flex-col gap-2 pt-1">
              <Button
                onClick={handleConfirm}
                disabled={isPending}
                className="w-full bg-red-600 hover:bg-red-700 text-white"
              >
                {isPending ? 'Discharging…' : 'Confirm Discharge'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full text-gray-500"
                onClick={() => setOpen(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
