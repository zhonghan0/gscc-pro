// Derives a human-readable period label from trip date strings (YYYY-MM-DD).
export function computePeriodLabel(dates: (string | null)[]): string {
  const valid = dates.filter(Boolean).sort() as string[]
  if (valid.length === 0) return 'No trips yet'

  const first = valid[0]
  const last = valid[valid.length - 1]

  const fmt = (d: string) => {
    const [y, m] = d.split('-')
    return new Date(parseInt(y), parseInt(m) - 1, 1)
      .toLocaleDateString('en-MY', { month: 'short', year: 'numeric' })
  }

  if (first === last || first.slice(0, 7) === last.slice(0, 7)) {
    return fmt(first)                     // same month: "Nov 2025"
  }
  if (first.slice(0, 4) === last.slice(0, 4)) {
    // same year: "Nov – Dec 2025"
    const [y, m1] = first.split('-')
    const [, m2] = last.split('-')
    const mon1 = new Date(parseInt(y), parseInt(m1) - 1, 1).toLocaleDateString('en-MY', { month: 'short' })
    const mon2 = new Date(parseInt(y), parseInt(m2) - 1, 1).toLocaleDateString('en-MY', { month: 'short' })
    return `${mon1} – ${mon2} ${y}`
  }
  // different years: "Dec 2025 – Jan 2026"
  return `${fmt(first)} – ${fmt(last)}`
}
