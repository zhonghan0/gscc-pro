// ── Role definitions ──────────────────────────────────────────────────────

export type Role = 'owner' | 'manager' | 'care_staff' | 'billing'

export const ROLES: Role[] = ['owner', 'manager', 'care_staff', 'billing']

export const ROLE_LABELS: Record<Role, string> = {
  owner:      'Owner',
  manager:    'Manager',
  care_staff: 'Care Staff',
  billing:    'Billing',
}

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  owner:      'Full system access — user management, settings, and all features',
  manager:    'Manage residents, billing, workers, and view reports',
  care_staff: 'View residents and workers, and log care notes',
  billing:    'Manage payments, extra charges, driver payouts, and export data',
}

export const ROLE_BADGE_CLASS: Record<Role, string> = {
  owner:      'bg-purple-100 text-purple-700',
  manager:    'bg-blue-100 text-blue-700',
  care_staff: 'bg-green-100 text-green-700',
  billing:    'bg-orange-100 text-orange-700',
}

// ── Permission checks ─────────────────────────────────────────────────────
// All functions accept any string/null so callers don't have to cast.

/** Owner only — user management, master data, system settings */
export function isOwner(role: string | null | undefined): boolean {
  return role === 'owner'
}

/** Owner or Manager — can manage residents, workers, care notes, etc. */
export function isElevated(role: string | null | undefined): boolean {
  return role === 'owner' || role === 'manager'
}

/** Owner, Manager, or Billing — can access financial features */
export function canAccessBilling(role: string | null | undefined): boolean {
  return role === 'owner' || role === 'manager' || role === 'billing'
}

/** Owner, Manager, or Care Staff — can view/write care logs */
export function canAccessCareNotes(role: string | null | undefined): boolean {
  return role === 'owner' || role === 'manager' || role === 'care_staff'
}

/** Owner, Manager, or Care Staff — can view workers/caregivers */
export function canViewWorkers(role: string | null | undefined): boolean {
  return role === 'owner' || role === 'manager' || role === 'care_staff'
}

/** Owner, Manager, or Billing — can view reports */
export function canAccessReports(role: string | null | undefined): boolean {
  return role === 'owner' || role === 'manager' || role === 'billing'
}

/**
 * Legacy alias: used throughout codebase as `isAdmin`.
 * Maps to isElevated (owner or manager) for backwards compatibility.
 */
export function isAdmin(role: string | null | undefined): boolean {
  return isElevated(role)
}
