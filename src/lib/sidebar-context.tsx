'use client'

import { createContext, useContext, useState } from 'react'
import { isElevated } from '@/lib/permissions'

type Profile = { full_name: string | null; role: string | null } | null
type Counts  = { residents: number; caregivers: number; localWorkers: number }

interface SidebarContextValue {
  collapsed: boolean
  toggle: () => void
  /** @deprecated use `role` directly; kept for legacy component compat */
  isAdmin: boolean
  role: string | null
  profile: Profile
  counts: Counts
}

const SidebarContext = createContext<SidebarContextValue>({
  collapsed: false,
  toggle: () => {},
  isAdmin: false,
  role: null,
  profile: null,
  counts: { residents: 0, caregivers: 0, localWorkers: 0 },
})

interface SidebarProviderProps {
  children: React.ReactNode
  profile?: Profile
  counts?: Counts
}

export function SidebarProvider({
  children,
  profile = null,
  counts = { residents: 0, caregivers: 0, localWorkers: 0 },
}: SidebarProviderProps) {
  const [collapsed, setCollapsed] = useState(false)
  const role = profile?.role ?? null
  return (
    <SidebarContext.Provider value={{
      collapsed,
      toggle: () => setCollapsed(v => !v),
      isAdmin: isElevated(role),
      role,
      profile,
      counts,
    }}>
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  return useContext(SidebarContext)
}
