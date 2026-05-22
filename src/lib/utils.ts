import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { differenceInYears, parseISO, format } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function calculateAge(dateOfBirth: string | null): number {
  if (!dateOfBirth) return 0
  return differenceInYears(new Date(), parseISO(dateOfBirth))
}

export function formatDate(date: string | null): string {
  if (!date) return '—'
  return format(parseISO(date), 'd MMM yyyy')
}

export function formatDateTime(date: string): string {
  return format(parseISO(date), 'd MMM yyyy, h:mm a')
}

/**
 * Parse a Malaysian IC (NRIC) number.
 * Format: YYMMDD-PB-XXXX  (12 digits, hyphens optional)
 *   YY   = year of birth (2-digit)
 *   MM   = month of birth
 *   DD   = day of birth
 *   PB   = place-of-birth code (ignored)
 *   XXXX = unique number; last digit odd → Male, even → Female
 */
export function parseNRIC(nric: string): {
  dob: string
  gender: 'male' | 'female'
  age: number
} | null {
  const digits = nric.replace(/\D/g, '')
  if (digits.length !== 12) return null

  const yy = parseInt(digits.substring(0, 2), 10)
  const mm = parseInt(digits.substring(2, 4), 10)
  const dd = parseInt(digits.substring(4, 6), 10)
  const lastDigit = parseInt(digits.charAt(11), 10)

  if (isNaN(yy) || isNaN(mm) || isNaN(dd) || isNaN(lastDigit)) return null
  if (mm < 1 || mm > 12) return null
  if (dd < 1 || dd > 31) return null

  // Century: if yy <= current 2-digit year → 2000s, else 1900s
  const currentYY = new Date().getFullYear() % 100
  const year = yy <= currentYY ? 2000 + yy : 1900 + yy

  const dob = `${year}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`
  const gender: 'male' | 'female' = lastDigit % 2 !== 0 ? 'male' : 'female'
  const age = differenceInYears(new Date(), new Date(dob))

  return { dob, gender, age }
}

/**
 * Auto-format NRIC as the user types: XXXXXX-XX-XXXX
 */
export function formatNRIC(raw: string): string {
  const digits = raw.replace(/\D/g, '').substring(0, 12)
  if (digits.length <= 6) return digits
  if (digits.length <= 8) return `${digits.substring(0, 6)}-${digits.substring(6)}`
  return `${digits.substring(0, 6)}-${digits.substring(6, 8)}-${digits.substring(8)}`
}
