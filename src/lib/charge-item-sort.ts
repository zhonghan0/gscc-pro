export type ChargeItemSortBy = 'category' | 'name'
export const CHARGE_ITEM_SORT_KEY = 'chargeItemSort'

export const CATEGORY_ORDER = [
  'Transportation', 'Clinic Bills', 'Medicines',
  'Groceries', 'Services', 'Refund', 'Others',
]

export function sortChargeItems<T extends { name: string; category?: string | null }>(
  items: T[],
  sortBy: ChargeItemSortBy,
): T[] {
  const sorted = [...items]
  if (sortBy === 'name') {
    sorted.sort((a, b) => a.name.localeCompare(b.name))
  } else {
    sorted.sort((a, b) => {
      const ai = CATEGORY_ORDER.indexOf(a.category || 'Others')
      const bi = CATEGORY_ORDER.indexOf(b.category || 'Others')
      const catDiff = (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
      if (catDiff !== 0) return catDiff
      return a.name.localeCompare(b.name)
    })
  }
  return sorted
}

export function getStoredSort(): ChargeItemSortBy {
  if (typeof window === 'undefined') return 'category'
  return (localStorage.getItem(CHARGE_ITEM_SORT_KEY) as ChargeItemSortBy) || 'category'
}

export function setStoredSort(sortBy: ChargeItemSortBy) {
  localStorage.setItem(CHARGE_ITEM_SORT_KEY, sortBy)
}
