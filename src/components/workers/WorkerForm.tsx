'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { Worker, Position } from '@/lib/types'
import { createWorker, updateWorker } from '@/actions/workers'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { parseNRIC, formatNRIC, formatDate } from '@/lib/utils'
import { GENDER_OPTIONS, WORKER_STATUS_OPTIONS } from '@/lib/constants'
import { User, Briefcase } from 'lucide-react'

interface WorkerFormProps {
  worker?: Worker
  positions: Position[]
  defaultWorkerType?: 'local' | 'foreign'
}

type Tab = 'personal' | 'employment'

function yearsOfWork(start: string | null): string {
  if (!start) return '—'
  const ms = Date.now() - new Date(start).getTime()
  const years = Math.floor(ms / (365.25 * 24 * 3600 * 1000))
  const months = Math.floor((ms % (365.25 * 24 * 3600 * 1000)) / (30.44 * 24 * 3600 * 1000))
  if (years === 0) return `${months} month${months !== 1 ? 's' : ''}`
  if (months === 0) return `${years} year${years !== 1 ? 's' : ''}`
  return `${years} yr${years !== 1 ? 's' : ''} ${months} mo`
}

export function WorkerForm({ worker, positions, defaultWorkerType }: WorkerFormProps) {
  const isEdit = !!worker
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('personal')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isDirty, setDirty] = useState(false)
  const [showExitConfirm, setShowExitConfirm] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  // Esc → cancel (with dirty check)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      // Let browser handle Esc inside the confirm dialog itself
      if (showExitConfirm) { setShowExitConfirm(false); return }
      if (isDirty) {
        setShowExitConfirm(true)
      } else {
        router.back()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isDirty, showExitConfirm, router])

  function handleCancel() {
    if (isDirty) {
      setShowExitConfirm(true)
    } else {
      router.back()
    }
  }

  function handleSaveAndExit() {
    setShowExitConfirm(false)
    // Small delay so state updates before submit fires
    setTimeout(() => formRef.current?.requestSubmit(), 0)
  }

  // Worker type — locked after creation
  const [workerType, setWorkerType] = useState<'local' | 'foreign'>(worker?.worker_type ?? defaultWorkerType ?? 'local')

  // ── Shared personal ───────────────────────
  const [name, setName] = useState(worker?.name ?? '')
  const [nickname, setNickname] = useState(worker?.nickname ?? '')
  const [gender, setGender] = useState(worker?.gender ?? '')
  const [dob, setDob] = useState(worker?.date_of_birth ?? '')
  const [contact, setContact] = useState(worker?.contact_number ?? '')

  // ── Local personal ────────────────────────
  const [nric, setNric] = useState(worker?.nric ?? '')
  const [positionId, setPositionId] = useState(worker?.position_id ?? '')
  const [address, setAddress] = useState(worker?.address ?? '')

  // ── Foreign personal ──────────────────────
  const [country, setCountry] = useState(worker?.country_of_origin ?? '')
  const [passport, setPassport] = useState(worker?.passport_number ?? '')
  const [passportExpiry, setPassportExpiry] = useState(worker?.passport_expiry ?? '')
  const [passportPermit, setPassportPermit] = useState(worker?.passport_permit_date ?? '')

  // ── Employment & Payroll ──────────────────
  const [status, setStatus] = useState(worker?.status ?? 'active')
  const [dateStart, setDateStart] = useState(worker?.date_start_work ?? '')
  const [dateEnd, setDateEnd] = useState(worker?.date_end_work ?? '')
  const [salary, setSalary] = useState(worker?.current_salary?.toString() ?? '')
  const [remark, setRemark] = useState(worker?.remark ?? '')
  // Local payroll
  const [bank, setBank] = useState(worker?.bank ?? '')
  const [bankAcc, setBankAcc] = useState(worker?.bank_account_number ?? '')
  const [kwsp, setKwsp] = useState(worker?.kwsp ?? '')
  // Foreign payroll
  const [majikan, setMajikan] = useState(worker?.majikan ?? '')
  const [majikanEmail, setMajikanEmail] = useState(worker?.majikan_email ?? '')
  const [typhoidExpiry, setTyphoidExpiry] = useState(worker?.typhoid_vaccine_expiry ?? '')

  // NRIC auto-detect
  function handleNricChange(raw: string) {
    const formatted = formatNRIC(raw)
    setNric(formatted)
    const parsed = parseNRIC(formatted)
    if (parsed) {
      setDob(parsed.dob)
      setGender(parsed.gender)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const data = {
      worker_type: workerType,
      status: status as 'active' | 'inactive',
      name,
      nickname: nickname || null,
      gender: (gender as 'male' | 'female') || null,
      date_of_birth: dob || null,
      contact_number: contact || null,
      date_start_work: dateStart || null,
      date_end_work: dateEnd || null,
      current_salary: salary ? parseFloat(salary) : null,
      remark: remark || null,
      // local
      nric: workerType === 'local' ? nric || null : null,
      position_id: workerType === 'local' ? positionId || null : null,
      address: workerType === 'local' ? address || null : null,
      bank: workerType === 'local' ? bank || null : null,
      bank_account_number: workerType === 'local' ? bankAcc || null : null,
      kwsp: workerType === 'local' ? kwsp || null : null,
      // foreign
      country_of_origin: workerType === 'foreign' ? country || null : null,
      passport_number: workerType === 'foreign' ? passport || null : null,
      passport_expiry: workerType === 'foreign' ? passportExpiry || null : null,
      passport_permit_date: workerType === 'foreign' ? passportPermit || null : null,
      majikan: workerType === 'foreign' ? majikan || null : null,
      majikan_email: workerType === 'foreign' ? majikanEmail || null : null,
      typhoid_vaccine_expiry: workerType === 'foreign' ? typhoidExpiry || null : null,
    }

    try {
      if (isEdit) {
        await updateWorker(worker.id, data)
      } else {
        await createWorker(data)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  const tabs = [
    { id: 'personal' as Tab, label: 'Personal Details', icon: User },
    { id: 'employment' as Tab, label: 'Employment & Payroll', icon: Briefcase },
  ]

  return (
    <>
    {/* Unsaved-changes exit dialog */}
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
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => { setShowExitConfirm(false); router.back() }}
            >
              Discard &amp; leave
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full text-gray-500"
              onClick={() => setShowExitConfirm(false)}
            >
              Keep editing
            </Button>
          </div>
        </div>
      </div>
    )}

    <form ref={formRef} onSubmit={handleSubmit} onChange={() => setDirty(true)} className="space-y-6">

      {/* Worker type — selector when generic new, badge when editing */}
      {!isEdit && !defaultWorkerType ? (
        <div>
          <Label>Worker Type *</Label>
          <div className="flex gap-3 mt-1">
            {(['local', 'foreign'] as const).map(type => (
              <button
                key={type}
                type="button"
                onClick={() => setWorkerType(type)}
                className={`flex-1 py-3 rounded-xl border-2 text-sm font-medium transition-colors ${
                  workerType === type
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                {type === 'local' ? '🇲🇾 Local Worker' : '🌏 Caregiver'}
              </button>
            ))}
          </div>
        </div>
      ) : isEdit ? (
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${
            workerType === 'local'
              ? 'bg-blue-50 text-blue-700'
              : 'bg-orange-50 text-orange-700'
          }`}>
            {workerType === 'local' ? '🇲🇾 Local Worker' : '🌏 Caregiver'}
          </span>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
          }`}>
            {status}
          </span>
        </div>
      ) : null}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* ── PERSONAL DETAILS ─────────────────────── */}
      {tab === 'personal' && (
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Full Name *</Label>
            <Input id="name" required value={name} onChange={e => setName(e.target.value)} placeholder="Worker's full name" />
          </div>
          <div>
            <Label htmlFor="nickname">Nickname</Label>
            <Input id="nickname" value={nickname} onChange={e => setNickname(e.target.value)} placeholder="e.g. Ati, Selly, Min Hui" />
          </div>

          {workerType === 'local' ? (
            <>
              {/* NRIC */}
              <div>
                <Label htmlFor="nric">NRIC</Label>
                <Input
                  id="nric"
                  value={nric}
                  onChange={e => handleNricChange(e.target.value)}
                  placeholder="e.g. 850315-14-5678"
                  maxLength={14}
                />
                <p className="text-xs text-gray-400 mt-1">Auto-fills DOB and gender</p>
              </div>

              {/* Auto-filled row */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Date of Birth</Label>
                  <Input type="date" value={dob} onChange={e => setDob(e.target.value)} className="bg-blue-50" />
                </div>
                <div>
                  <Label>Age</Label>
                  <Input
                    readOnly
                    value={dob ? String(Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 3600 * 1000))) : ''}
                    placeholder="—"
                    className="bg-blue-50"
                  />
                </div>
                <div>
                  <Label>Gender</Label>
                  <Input
                    readOnly
                    value={gender === 'male' ? 'Male' : gender === 'female' ? 'Female' : ''}
                    placeholder="—"
                    className="bg-blue-50"
                  />
                </div>
              </div>

              {/* Position */}
              <div>
                <Label htmlFor="position">Position</Label>
                <Select id="position" value={positionId} onChange={e => setPositionId(e.target.value)}>
                  <option value="">Select position</option>
                  {positions.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </Select>
                <p className="text-xs text-gray-400 mt-1">
                  Manage positions at{' '}
                  <a href="/admin/positions" className="text-blue-500 hover:underline">Admin → Positions</a>
                </p>
              </div>

              {/* Contact + Address */}
              <div>
                <Label htmlFor="contact">Contact Number</Label>
                <Input id="contact" value={contact} onChange={e => setContact(e.target.value)} placeholder="e.g. 012-345 6789" />
              </div>
              <div>
                <Label htmlFor="address">Address</Label>
                <Textarea id="address" value={address} onChange={e => setAddress(e.target.value)} rows={2} placeholder="Home address" />
              </div>
            </>
          ) : (
            <>
              {/* Foreign worker personal */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="country">Country of Origin</Label>
                  <Input id="country" value={country} onChange={e => setCountry(e.target.value)} placeholder="e.g. Indonesia" />
                </div>
                <div>
                  <Label htmlFor="gender">Gender</Label>
                  <Select id="gender" value={gender} onChange={e => setGender(e.target.value)}>
                    <option value="">Select gender</option>
                    {GENDER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dob">Date of Birth</Label>
                  <Input id="dob" type="date" value={dob} onChange={e => setDob(e.target.value)} />
                </div>
                <div>
                  <Label>Age</Label>
                  <Input
                    readOnly
                    value={dob ? String(Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 3600 * 1000))) : ''}
                    placeholder="—"
                    className="bg-gray-50"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="passport">Passport Number</Label>
                <Input id="passport" value={passport} onChange={e => setPassport(e.target.value)} placeholder="e.g. A12345678" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="passport_expiry">Passport Expiry</Label>
                  <Input id="passport_expiry" type="date" value={passportExpiry} onChange={e => setPassportExpiry(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="passport_permit">Permit Date</Label>
                  <Input id="passport_permit" type="date" value={passportPermit} onChange={e => setPassportPermit(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="typhoid_expiry">Typhoid Vaccine Expiry</Label>
                  <Input id="typhoid_expiry" type="date" value={typhoidExpiry} onChange={e => setTyphoidExpiry(e.target.value)} />
                </div>
              </div>
              <div>
                <Label htmlFor="contact">Contact Number</Label>
                <Input id="contact" value={contact} onChange={e => setContact(e.target.value)} placeholder="e.g. 012-345 6789" />
              </div>
            </>
          )}
        </div>
      )}

      {/* ── EMPLOYMENT & PAYROLL ──────────────────── */}
      {tab === 'employment' && (
        <div className="space-y-4">
          {/* Status */}
          <div>
            <Label htmlFor="status">Status</Label>
            <Select id="status" value={status} onChange={e => setStatus(e.target.value as 'active' | 'inactive')}>
              {WORKER_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="date_start">Date Start Work</Label>
              <Input id="date_start" type="date" value={dateStart} onChange={e => setDateStart(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="date_end">Date End Work</Label>
              <Input
                id="date_end"
                type="date"
                value={dateEnd}
                onChange={e => {
                  setDateEnd(e.target.value)
                  if (e.target.value) setStatus('inactive')
                }}
              />
              <p className="text-xs text-gray-400 mt-1">Auto-sets status to Inactive</p>
            </div>
          </div>

          {/* Years of service (read-only) */}
          {dateStart && (
            <div className="bg-blue-50 rounded-lg px-4 py-3 flex items-center gap-3">
              <Briefcase className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <div>
                <p className="text-xs text-blue-600 font-medium uppercase tracking-wide">Years of Service</p>
                <p className="text-sm font-semibold text-blue-800">{yearsOfWork(dateStart)}</p>
              </div>
            </div>
          )}

          {/* Salary */}
          <div>
            <Label htmlFor="salary">Current Salary (RM)</Label>
            <Input
              id="salary"
              type="number"
              min={0}
              step="0.01"
              value={salary}
              onChange={e => setSalary(e.target.value)}
              placeholder="e.g. 1800.00"
            />
          </div>

          {workerType === 'local' ? (
            <>
              {/* Bank details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="bank">Bank</Label>
                  <Input id="bank" value={bank} onChange={e => setBank(e.target.value)} placeholder="e.g. Maybank" />
                </div>
                <div>
                  <Label htmlFor="bank_acc">Account Number</Label>
                  <Input id="bank_acc" value={bankAcc} onChange={e => setBankAcc(e.target.value)} placeholder="e.g. 1234567890" />
                </div>
              </div>
              {/* KWSP */}
              <div>
                <Label htmlFor="kwsp">KWSP / EPF Number</Label>
                <Input id="kwsp" value={kwsp} onChange={e => setKwsp(e.target.value)} placeholder="EPF member number" />
              </div>
            </>
          ) : (
            <>
              {/* Majikan */}
              <div>
                <Label htmlFor="majikan">Majikan (Employer)</Label>
                <Input id="majikan" value={majikan} onChange={e => setMajikan(e.target.value)} placeholder="Employer name" />
              </div>
              <div>
                <Label htmlFor="majikan_email">Majikan Email</Label>
                <Input id="majikan_email" type="email" value={majikanEmail} onChange={e => setMajikanEmail(e.target.value)} placeholder="employer@company.com" />
              </div>
            </>
          )}

          {/* Remark */}
          <div>
            <Label htmlFor="remark">Remark</Label>
            <Textarea id="remark" value={remark} onChange={e => setRemark(e.target.value)} rows={3} placeholder="Any additional notes" />
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
          <Button type="button" variant="ghost" onClick={handleCancel}>Cancel</Button>
          <span className="text-xs text-gray-400 select-none hidden sm:inline">
            <kbd className="font-mono bg-gray-100 border border-gray-200 rounded px-1">Esc</kbd> to cancel
          </span>
        </div>
        <div className="flex items-center gap-2">
          {tab === 'personal' && (
            <Button type="button" variant="outline" onClick={() => setTab('employment')}>
              Next →
            </Button>
          )}
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Worker'}
          </Button>
        </div>
      </div>
    </form>
    </>
  )
}
