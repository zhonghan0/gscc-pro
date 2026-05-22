'use client'

import { MobileNav } from './MobileNav'
import { useSidebar } from '@/lib/sidebar-context'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'

interface HeaderProps {
  title: string
  titleNode?: React.ReactNode   // replaces title text when provided
  action?: React.ReactNode
}

export function Header({ title, titleNode, action }: HeaderProps) {
  const { collapsed, toggle } = useSidebar()

  return (
    <header className="flex items-center justify-between h-16 px-6 border-b border-gray-200 bg-white flex-shrink-0">
      <div className="flex items-center gap-3">
        {/* Mobile hamburger */}
        <MobileNav />
        {/* Desktop sidebar toggle */}
        <button
          onClick={toggle}
          className="hidden lg:flex p-1.5 rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed
            ? <PanelLeftOpen className="w-5 h-5" />
            : <PanelLeftClose className="w-5 h-5" />
          }
        </button>
        <h1 className="text-lg font-semibold text-gray-900">{titleNode ?? title}</h1>
      </div>
      {action && <div>{action}</div>}
    </header>
  )
}
