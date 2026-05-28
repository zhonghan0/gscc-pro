import { createClient } from '@/lib/supabase/server'

// ─── Typed settings keys ───────────────────────────────────────────────────

export interface AppSettings {
  driver_transport_default: number
  transport_item_default_price: number
  extra_charges_months_shown: number
  report_default_months: number
  export_payments_months: number
  payment_rate_green_threshold: number
  payment_rate_yellow_threshold: number
  expiry_urgent_days: number
  care_log_preview_chars: number
}

// Fallback values used if the DB row is missing
const DEFAULTS: AppSettings = {
  driver_transport_default: 70,
  transport_item_default_price: 100,
  extra_charges_months_shown: 3,
  report_default_months: 12,
  export_payments_months: 24,
  payment_rate_green_threshold: 100,
  payment_rate_yellow_threshold: 70,
  expiry_urgent_days: 30,
  care_log_preview_chars: 80,
}

// ─── Server-side loader ────────────────────────────────────────────────────

/**
 * Fetch all app settings from the database.
 * Falls back to DEFAULTS for any missing key so callers always get a full object.
 * Safe to call from Server Components and Server Actions.
 */
export async function getSettings(): Promise<AppSettings> {
  const supabase = createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any).from('app_settings').select('key, value') as {
    data: { key: string; value: string }[] | null
  }

  const settings = { ...DEFAULTS }
  for (const row of data ?? []) {
    if (Object.prototype.hasOwnProperty.call(settings, row.key)) {
      const parsed = parseFloat(row.value)
      if (!isNaN(parsed)) {
        (settings as Record<string, number>)[row.key] = parsed
      }
    }
  }
  return settings
}
