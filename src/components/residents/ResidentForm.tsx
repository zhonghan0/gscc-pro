'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { Resident } from '@/lib/types'
import { createResident, updateResident } from '@/actions/residents'
import type { Worker } from '@/lib/types'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  CONDITION_OPTIONS,
  PHYSIO_OPTIONS,
  STATUS_OPTIONS,
  HEALTH_CONDITIONS,
} from '@/lib/constants'
import { parseNRIC, formatNRIC, formatDate } from '@/lib/utils'

interface ResidentFormProps {
  resident?: Resident
  workers?: Pick<Worker, 'id' | 'name' | 'worker_type'>[]
}

type Tab = 'details' | 'package' | 'health'

export function ResidentForm({ resident, workers = [] }: ResidentFormProps) {
  const isEdit = !!resident
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('details')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isDirty, setDirty] = useState(false)
  const [showExitConfirm, setShowExitConfirm] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      if (showExitConfirm) { setShowExitConfirm(false); return }
      if (isDirty) setShowExitConfirm(true)
      else router.back()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isDirty, showExitConfirm, router])

  function handleCancel() {
    if (isDirty) setShowExitConfirm(true)
    else router.back()
  }

  function handleSaveAndExit() {
    setShowExitConfirm(false)
    setTimeout(() => formRef.current?.requestSubmit(), 0)
  }

  // ── Details ──────────────────────────────────────────────
  const [fullName, setFullName] = useState(resident?.full_name ?? '')
  const [nric, setNric] = useState(resident?.nric ?? '')
  const [dob, setDob] = useState(resident?.date_of_birth ?? '')
  const [gender, setGender] = useState<'male' | 'female' | ''>(resident?.gender ?? '')
  const [age, setAge] = useState<number | null>(null)
  const [condition, setCondition] = useState(resident?.condition ?? '')
  const [address, setAddress] = useState(resident?.address ?? '')
  const [admissionDate, setAdmissionDate] = useState(
    resident?.admission_date ?? new Date().toISOString().split('T')[0]
  )
  const [dischargeDate, setDischargeDate] = useState(resident?.date_of_discharge ?? '')
  const [status, setStatus] = useState(resident?.status ?? 'active')

  // ── Package ───────────────────────────────────────────────
  const [physio, setPhysio] = useState(resident?.physio ?? 'no')
  const [physioRemark, setPhysioRemark] = useState(resident?.physio_remark ?? '')
  const [caregiverId, setCaregiverId] = useState(resident?.caregiver_id ?? '')
  const [includeMisc, setIncludeMisc] = useState(resident?.include_misc ?? false)
  const [payDay, setPayDay] = useState<string>(resident?.pay_day?.toString() ?? '1')
  const [fee, setFee] = useState<string>(resident?.fee?.toString() ?? '')
  const [packageRemark, setPackageRemark] = useState(resident?.package_remark ?? '')

  // ── Health ────────────────────────────────────────────────
  // Parse existing comma-separated string into a Set of selected conditions
  const [selectedConditions, setSelectedConditions] = useState<Set<string>>(() => {
    const stored = resident?.health_condition ?? ''
    if (!stored) return new Set()
    return new Set(stored.split(',').map(s => s.trim()).filter(Boolean))
  })
  const [healthRemark, setHealthRemark] = useState(resident?.health_remark ?? '')

  function toggleCondition(condition: string) {
    setSelectedConditions(prev => {
      const next = new Set(prev)
      if (next.has(condition)) next.delete(condition)
      else next.add(condition)
      return next
    })
  }

  // ── NRIC auto-detection ───────────────────────────────────
  function handleNricChange(raw: string) {
    const formatted = formatNRIC(raw)
    setNric(formatted)

    const parsed = parseNRIC(formatted)
    if (parsed) {
      setDob(parsed.dob)
      setGender(parsed.gender)
      setAge(parsed.age)
    } else {
      setAge(null)
    }
  }

  // ── Submit ────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const data = {
      full_name: fullName,
      nric: nric || null,
      date_of_birth: dob || null,
      gender: (gender as 'male' | 'female') || null,
      condition: (condition as 'mobile' | 'wheelchair_bound' | 'bedridden') || null,
      address: address || null,
      admission_date: admissionDate,
      date_of_discharge: dischargeDate || null,
      status: status as 'active' | 'discharged',
      physio: (physio as 'yes' | 'no' | 'foc' | 'alternate_day') || null,
      physio_remark: physioRemark || null,
      caregiver_id: caregiverId || null,
      include_misc: includeMisc,
      pay_day: payDay ? parseInt(payDay, 10) : null,
      fee: fee ? parseFloat(fee) : null,
      account: null,
      package_remark: packageRemark || null,
      health_condition: selectedConditions.size > 0 ? Array.from(selectedConditions).join(', ') : null,
      health_remark: healthRemark || null,
    }

    try {
      if (isEdit) {
        await updateResident(resident.id, data)
      } else {
        await createResident(data)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'details', label: 'Details' },
    { id: 'package', label: 'Package' },
    { id: 'health', label: 'Health Condition' },
  ]

  // Compute display age from existing DOB when editing (no NRIC change yet)
  const displayAge = age ?? (dob ? (() => {
    const p = parseNRIC('')
    const diff = Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 3600 * 1000))
    return diff > 0 ? diff : null
  })() : null)

  return (
    <>
    {showExitConfirm && (
      <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Unsaved changes</h3>
            <p className="text-sm text-gray-500 mt-1">You have unsaved changes. Save before leaving?</p>
          </div>
          <div className="flex flex-col gap-2">
            <Button type="button" onClick={handleSaveAndExit} className="w-full">
              Save changes
            </Button>
            <Button type="button" variant="outline" className="w-full" onClick={() => { setShowExitConfirm(false); router.back() }}>
              Discard &amp; leave
            </Button>
            <Button type="button" variant="ghost" className="w-full text-gray-500" onClick={() => setShowExitConfirm(false)}>
              Keep editing
            </Button>
          </div>
        </div>
      </div>
    )}
    <form ref={formRef} onSubmit={handleSubmit} onChange={() => setDirty(true)} className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {tabs.map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── DETAILS TAB ─────────────────────────────────────── */}
      {activeTab === 'details' && (
        <div className="space-y-5">
          {/* Full name */}
          <div>
            <Label htmlFor="full_name">Full Name *</Label>
            <Input
              id="full_name"
              required
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="e.g. Tan Ah Kow"
            />
          </div>

          {/* NRIC */}
          <div>
            <Label htmlFor="nric">NRIC</Label>
            <Input
              id="nric"
              value={nric}
              onChange={e => handleNricChange(e.target.value)}
              placeholder="e.g. 501215-14-5678"
              maxLength={14}
            />
            <p className="text-xs text-gray-400 mt-1">
              Format: YYMMDD-PB-XXXX — DOB, gender and age will auto-fill
            </p>
          </div>

          {/* Auto-filled row */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="dob">Date of Birth</Label>
              <Input
                id="dob"
                type="date"
                tabIndex={-1}
                value={dob}
                onChange={e => setDob(e.target.value)}
              />
              <p className="text-xs text-gray-400 mt-1">Auto-filled from NRIC or enter manually</p>
            </div>
            <div>
              <Label>Age</Label>
              <Input
                readOnly
                tabIndex={-1}
                value={
                  dob
                    ? String(Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 3600 * 1000)))
                    : ''
                }
                placeholder="—"
                className="bg-gray-50 text-gray-500"
              />
              <p className="text-xs text-gray-400 mt-1">Auto from DOB</p>
            </div>
            <div>
              <Label htmlFor="gender">Gender</Label>
              <Select
                id="gender"
                tabIndex={-1}
                value={gender}
                onChange={e => setGender(e.target.value as 'male' | 'female' | '')}
              >
                <option value="">— Select —</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </Select>
              <p className="text-xs text-gray-400 mt-1">Auto-filled from NRIC or select manually</p>
            </div>
          </div>

          {/* Condition */}
          <div>
            <Label htmlFor="condition">Condition</Label>
            <Select
              id="condition"
              value={condition}
              onChange={e => setCondition(e.target.value)}
            >
              <option value="">Select condition</option>
              {CONDITION_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </Select>
          </div>

          {/* Address */}
          <div>
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              value={address}
              onChange={e => setAddress(e.target.value)}
              rows={2}
              placeholder="Home address"
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="admission">Date of Admission *</Label>
              <Input
                id="admission"
                type="date"
                required
                value={admissionDate}
                onChange={e => setAdmissionDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="discharge">Date of Discharge</Label>
              <Input
                id="discharge"
                type="date"
                value={dischargeDate}
                onChange={e => {
                  setDischargeDate(e.target.value)
                  if (e.target.value) setStatus('discharged')
                }}
              />
              <p className="text-xs text-gray-400 mt-1">Fill for discharged residents</p>
            </div>
          </div>

          {/* Status */}
          <div>
            <Label htmlFor="status">Status</Label>
            <Select id="status" value={status} onChange={e => setStatus(e.target.value as 'active' | 'discharged')}>
              {STATUS_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </Select>
          </div>
        </div>
      )}

      {/* ── PACKAGE TAB ─────────────────────────────────────── */}
      {activeTab === 'package' && (
        <div className="space-y-5">
          {/* Physio */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="physio">Physiotherapy</Label>
              <Select id="physio" value={physio} onChange={e => setPhysio(e.target.value as 'yes' | 'no' | 'foc' | 'alternate_day')}>
                <option value="">Select</option>
                {PHYSIO_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="physio_remark">Physio Remark</Label>
              <Input
                id="physio_remark"
                value={physioRemark}
                onChange={e => setPhysioRemark(e.target.value)}
                placeholder="Any physio notes"
              />
            </div>
          </div>

          {/* Caregiver */}
          <div>
            <Label htmlFor="caregiver">Caregiver</Label>
            <Select id="caregiver" value={caregiverId} onChange={e => setCaregiverId(e.target.value)}>
              <option value="">— No caregiver assigned —</option>
              {workers.filter(w => w.worker_type === 'local').length > 0 && (
                <optgroup label="🇲🇾 Local Workers">
                  {workers.filter(w => w.worker_type === 'local').map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </optgroup>
              )}
              {workers.filter(w => w.worker_type === 'foreign').length > 0 && (
                <optgroup label="🌏 Caregivers">
                  {workers.filter(w => w.worker_type === 'foreign').map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </optgroup>
              )}
            </Select>
            {workers.length === 0 && (
              <p className="text-xs text-gray-400 mt-1">
                No workers yet.{' '}
                <a href="/admin/workers/new" className="text-blue-500 hover:underline">Add a worker first</a>
              </p>
            )}
          </div>

          {/* Include Misc */}
          <div>
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeMisc}
                onChange={e => setIncludeMisc(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600"
              />
              <span className="text-sm font-medium text-gray-700">Include Misc charges</span>
            </label>
          </div>

          {/* Pay Day + Fee */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="pay_day">Pay Day</Label>
              <Input
                id="pay_day"
                type="number"
                min={1}
                max={31}
                value={payDay}
                onChange={e => setPayDay(e.target.value)}
                placeholder="1 – 31"
              />
            </div>
            <div>
              <Label htmlFor="fee">Fee (RM)</Label>
              <Input
                id="fee"
                type="number"
                min={0}
                step="0.01"
                value={fee}
                onChange={e => setFee(e.target.value)}
                placeholder="e.g. 1500.00"
              />
            </div>
          </div>

          {/* Package Remark */}
          <div>
            <Label htmlFor="package_remark">Package Remark</Label>
            <Textarea
              id="package_remark"
              value={packageRemark}
              onChange={e => setPackageRemark(e.target.value)}
              rows={3}
              placeholder="Any package notes or special arrangements"
            />
          </div>
        </div>
      )}

      {/* ── HEALTH TAB ──────────────────────────────────────── */}
      {activeTab === 'health' && (
        <div className="space-y-5">
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label>Health Conditions</Label>
              {selectedConditions.size > 0 && (
                <span className="text-xs text-indigo-600 font-medium">
                  {selectedConditions.size} selected
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {HEALTH_CONDITIONS.map(condition => (
                <label
                  key={condition}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors select-none ${
                    selectedConditions.has(condition)
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-900'
                      : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded accent-indigo-600 flex-shrink-0"
                    checked={selectedConditions.has(condition)}
                    onChange={() => toggleCondition(condition)}
                  />
                  <span className="text-sm leading-tight">{condition}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <Label htmlFor="health_remark">Health Remark</Label>
            <Textarea
              id="health_remark"
              value={healthRemark}
              onChange={e => setHealthRemark(e.target.value)}
              rows={4}
              placeholder="Any additional health notes, medication, allergies…"
            />
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-gray-200">
        <div className="flex items-center gap-3">
          <Button type="button" variant="ghost" onClick={handleCancel}>
            Cancel
          </Button>
          <span className="text-xs text-gray-400 select-none hidden sm:inline">
            <kbd className="font-mono bg-gray-100 border border-gray-200 rounded px-1">Esc</kbd> to cancel
          </span>
        </div>
        <div className="flex items-center gap-2">
          {activeTab !== 'health' && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setActiveTab(activeTab === 'details' ? 'package' : 'health')}
            >
              Next →
            </Button>
          )}
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Resident'}
          </Button>
        </div>
      </div>
    </form>
    </>
  )
}
