import { Link, NavLink } from 'react-router-dom'
import { Menu, Search } from 'lucide-react'
import { APP_NAME, ROUTES } from '@/config/constants'
import { primaryNavItems, settingsNavItem } from '@/config/navigation'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import * as React from 'react'

export function MobileNav() {
  const [open, setOpen] = React.useState(false)

  return (
    <>
      <header className="flex items-center justify-between gap-3 border-b bg-card/80 px-4 py-3 backdrop-blur md:hidden">
        <Link to={ROUTES.dashboard} className="text-sm font-semibold tracking-wide">
          {APP_NAME}
        </Link>
        <div className="flex items-center gap-1">
          <Button asChild variant="ghost" size="icon" aria-label="Search">
            <Link to={ROUTES.search}>
              <Search className="h-4 w-4" />
            </Link>
          </Button>
          <Button variant="ghost" size="icon" onClick={() => { setOpen((v) => !v) }} aria-label="Open menu">
            <Menu />
          </Button>
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => { setOpen(false) }}
            aria-label="Close menu"
          />
          <nav className="absolute right-0 top-0 flex h-full w-72 flex-col gap-1 border-l bg-card p-4 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-semibold">Navigation</span>
              <Button variant="ghost" size="sm" onClick={() => { setOpen(false) }}>Close</Button>
            </div>
            {primaryNavItems.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                onClick={() => { setOpen(false) }}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm',
                    isActive ? 'bg-primary/10 font-medium text-primary' : 'text-muted-foreground',
                  )
                }
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}
            <div className="mt-auto border-t pt-3">
              <NavLink
                to={settingsNavItem.href}
                onClick={() => { setOpen(false) }}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm',
                    isActive ? 'bg-primary/10 font-medium text-primary' : 'text-muted-foreground',
                  )
                }
              >
                <settingsNavItem.icon className="h-4 w-4" />
                {settingsNavItem.label}
              </NavLink>
            </div>
          </nav>
        </div>
      )}
    </>
  )
}
