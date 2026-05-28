'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useSidebar } from '@/lib/sidebar-context'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import {
  Users,
  ClipboardList,
  Shield,
  LogOut,
  Heart,
  HeartHandshake,
  HardHat,
  Layers,
  FileUp,
  Download,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  CreditCard,
  Receipt,
  ReceiptText,
  Car,
  BarChart2,
  SlidersHorizontal,
} from 'lucide-react'
import type { Role } from '@/lib/permissions'
import { isElevated, canAccessBilling, canViewWorkers, canAccessReports, isOwner } from '@/lib/permissions'
import { ROLE_LABELS, ROLE_BADGE_CLASS } from '@/lib/permissions'

type NavItem = {
  href: string
  label: string
  icon: React.ElementType
  /** Roles that can see this item. Undefined = all authenticated roles. */
  visibleTo?: Role[]
}

const residentsItems: NavItem[] = [
  { href: '/residents',  label: 'Residents', icon: Users },
  { href: '/care-notes', label: 'Care Logs',  icon: ClipboardList },
]

const teamItems: NavItem[] = [
  { href: '/admin/caregivers',    label: 'Caregiver',    icon: HeartHandshake },
  { href: '/admin/local-workers', label: 'Local Worker', icon: HardHat },
  { href: '/admin/positions',     label: 'Positions',    icon: Layers },
]

const billingItems: NavItem[] = [
  { href: '/payments',           label: 'Payments',      icon: CreditCard },
  { href: '/extra-charges',      label: 'Extra Charges', icon: ReceiptText },
  { href: '/driver-payouts',     label: 'Driver Payouts',icon: Car },
  { href: '/admin/charge-items', label: 'Charge Items',  icon: Receipt, visibleTo: ['owner', 'manager'] },
]

const othersItems: NavItem[] = [
  { href: '/admin/import',      label: 'Import Data',  icon: FileUp },
  { href: '/admin/export',      label: 'Export Data',  icon: Download },
  { href: '/admin/staff',       label: 'Users',        icon: Shield,           visibleTo: ['owner'] },
  { href: '/admin/master-data', label: 'Master Data',  icon: SlidersHorizontal, visibleTo: ['owner'] },
]

const reportItems: NavItem[] = [
  { href: '/reports/residents',  label: 'Residents',  icon: Users },
  { href: '/reports/revenue',    label: 'Revenue',    icon: BarChart2 },
  { href: '/reports/caregivers', label: 'Caregivers', icon: HeartHandshake },
]

function CountBadge({ count }: { count: number }) {
  return (
    <span className="ml-auto text-xs font-semibold bg-gray-100 text-gray-500 rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center leading-none">
      {count}
    </span>
  )
}

function NavLink({ href, label, icon: Icon, collapsed, active, count }: {
  href: string; label: string; icon: React.ElementType; collapsed: boolean; active: boolean; count?: number
}) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      className={cn(
        'flex items-center rounded-lg text-sm font-medium transition-colors',
        collapsed ? 'justify-center px-0 py-2.5 w-full' : 'gap-3 px-3 py-2.5',
        active ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      )}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      {!collapsed && (
        <>
          <span>{label}</span>
          {count !== undefined && <CountBadge count={count} />}
        </>
      )}
    </Link>
  )
}

function CollapsibleGroup({
  label, items, open, onToggle, collapsed, isActive, itemCounts,
}: {
  label: string
  items: NavItem[]
  open: boolean
  onToggle: () => void
  collapsed: boolean
  isActive: (href: string) => boolean
  itemCounts?: Record<string, number>
}) {
  if (items.length === 0) return null

  if (collapsed) {
    return (
      <>
        <div className="border-t border-gray-100 mx-2 my-1" />
        {items.map(({ href, label: itemLabel, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            title={itemLabel}
            className={cn(
              'flex items-center justify-center rounded-lg py-2.5 w-full transition-colors',
              isActive(href) ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            )}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
          </Link>
        ))}
      </>
    )
  }

  return (
    <div className="pt-1">
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-gray-600 transition-colors rounded-md hover:bg-gray-50"
      >
        <span>{label}</span>
        <ChevronDown className={cn(
          'w-3.5 h-3.5 transition-transform duration-200',
          open ? 'rotate-0' : '-rotate-90'
        )} />
      </button>

      {open && (
        <div className="mt-1 space-y-1">
          {items.map(({ href, label: itemLabel, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive(href) ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span>{itemLabel}</span>
              {itemCounts?.[href] !== undefined && <CountBadge count={itemCounts[href]} />}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { collapsed, toggle, role, profile, counts } = useSidebar()

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  // Filter items a role can see
  function visible(items: NavItem[]): NavItem[] {
    return items.filter(i => !i.visibleTo || i.visibleTo.includes(role as Role))
  }

  const visibleResidents = residentsItems  // All roles
  const visibleTeam      = canViewWorkers(role) ? teamItems : []
  const visibleBilling   = canAccessBilling(role) ? visible(billingItems) : []
  const visibleReports   = canAccessReports(role) ? reportItems : []
  const visibleOthers    = isElevated(role) ? visible(othersItems) : []

  const [residentsOpen, setResidentsOpen] = useState(residentsItems.some(i => isActive(i.href)))
  const [teamOpen,      setTeamOpen]      = useState(teamItems.some(i => isActive(i.href)))
  const [billingOpen,   setBillingOpen]   = useState(billingItems.some(i => isActive(i.href)))
  const [othersOpen,    setOthersOpen]    = useState(othersItems.some(i => isActive(i.href)))
  const [reportsOpen,   setReportsOpen]   = useState(reportItems.some(i => isActive(i.href)))

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const roleLabel = role && role in ROLE_LABELS
    ? ROLE_LABELS[role as Role]
    : role ?? ''
  const roleBadge = role && role in ROLE_BADGE_CLASS
    ? ROLE_BADGE_CLASS[role as Role]
    : 'bg-gray-100 text-gray-600'

  return (
    <aside className={cn(
      'flex flex-col min-h-screen bg-white border-r border-gray-200 transition-all duration-200',
      collapsed ? 'w-16' : 'w-64'
    )}>
      {/* Logo + toggle */}
      <div className={cn(
        'flex items-center h-16 border-b border-gray-200 flex-shrink-0',
        collapsed ? 'justify-center px-0' : 'px-4 justify-between'
      )}>
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <Heart className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm leading-tight">Care Pro</p>
              <p className="text-xs text-gray-500">Care Centre</p>
            </div>
          </Link>
        )}
        {collapsed && (
          <Link href="/dashboard" className="hover:opacity-80 transition-opacity">
            <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
              <Heart className="w-5 h-5 text-white" />
            </div>
          </Link>
        )}
        <button
          onClick={toggle}
          className={cn(
            'p-1.5 rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors',
            collapsed ? 'absolute left-14 top-4 z-10 bg-white border border-gray-200 shadow-sm' : ''
          )}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-hidden">

        <CollapsibleGroup
          label="Residents"
          items={visibleResidents}
          open={residentsOpen}
          onToggle={() => setResidentsOpen(o => !o)}
          collapsed={collapsed}
          isActive={isActive}
          itemCounts={{ '/residents': counts.residents }}
        />

        {visibleTeam.length > 0 && (
          <CollapsibleGroup
            label="Team"
            items={visibleTeam}
            open={teamOpen}
            onToggle={() => setTeamOpen(o => !o)}
            collapsed={collapsed}
            isActive={isActive}
            itemCounts={{
              '/admin/caregivers':    counts.caregivers,
              '/admin/local-workers': counts.localWorkers,
            }}
          />
        )}

        {visibleBilling.length > 0 && (
          <CollapsibleGroup
            label="Billing"
            items={visibleBilling}
            open={billingOpen}
            onToggle={() => setBillingOpen(o => !o)}
            collapsed={collapsed}
            isActive={isActive}
          />
        )}

        {visibleReports.length > 0 && (
          <CollapsibleGroup
            label="Reports"
            items={visibleReports}
            open={reportsOpen}
            onToggle={() => setReportsOpen(o => !o)}
            collapsed={collapsed}
            isActive={isActive}
          />
        )}

        {visibleOthers.length > 0 && (
          <CollapsibleGroup
            label="Others"
            items={visibleOthers}
            open={othersOpen}
            onToggle={() => setOthersOpen(o => !o)}
            collapsed={collapsed}
            isActive={isActive}
          />
        )}
      </nav>

      {/* User info + sign out */}
      <div className="px-2 py-4 border-t border-gray-200">
        {!collapsed && (
          <div className="flex items-center gap-3 px-3 py-2 mb-1">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <span className="text-blue-700 font-semibold text-xs">
                {profile?.full_name?.charAt(0)?.toUpperCase() ?? '?'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{profile?.full_name}</p>
              <span className={cn('text-xs font-medium px-1.5 py-0.5 rounded-full', roleBadge)}>
                {roleLabel}
              </span>
            </div>
          </div>
        )}
        <button
          onClick={handleSignOut}
          title={collapsed ? 'Sign out' : undefined}
          className={cn(
            'flex items-center rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors w-full',
            collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5'
          )}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </aside>
  )
}
