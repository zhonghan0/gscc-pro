'use client'

import { createContext, useContext, useState } from 'react'

type Profile = { full_name: string | null; role: string | null } | null
type Counts  = { residents: number; caregivers: number; localWorkers: number }

interface SidebarContextValue {
  collapsed: boolean
  toggle: () => void
  isAdmin: boolean
  profile: Profile
  counts: Counts
}

const SidebarContext = createContext<SidebarContextValue>({
  collapsed: false,
  toggle: () => {},
  isAdmin: false,
  profile: null,
  counts: { residents: 0, caregivers: 0, localWorkers: 0 },
})

interface SidebarProviderProps {
  children: React.ReactNode
  isAdmin?: boolean
  profile?: Profile
  counts?: Counts
}

export function SidebarProvider({
  children,
  isAdmin = false,
  profile = null,
  counts = { residents: 0, caregivers: 0, localWorkers: 0 },
}: SidebarProviderProps) {
  const [collapsed, setCollapsed] = useState(false)
  return (
    <SidebarContext.Provider value={{ collapsed, toggle: () => setCollapsed(v => !v), isAdmin, profile, counts }}>
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  return useContext(SidebarContext)
}
