'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import { Sidebar } from './Sidebar'

export function MobileNav() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  // Close drawer whenever the user navigates to a new page
  useEffect(() => { setOpen(false) }, [pathname])

  return (
    <>
      <button
        className="lg:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop — closes on tap */}
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />

          {/* Sidebar panel — no onClick so collapsible groups work */}
          <div className="absolute left-0 top-0 bottom-0 w-64 z-10">
            <Sidebar />
          </div>

          <button
            className="absolute top-4 left-64 ml-2 p-2 rounded-full bg-white text-gray-600 shadow"
            onClick={() => setOpen(false)}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </>
  )
}
