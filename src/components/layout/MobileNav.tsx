import { Link, NavLink } from 'react-router-dom'
import { LogOut, Menu, Search, ShieldCheck } from 'lucide-react'
import { ROUTES, APP_NAME } from '@/config/constants'
import { primaryNavItems, settingsNavItem } from '@/config/navigation'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { BrandMark, getInitials } from '@/components/layout/SidebarHeader'
import { cn } from '@/lib/utils'
import * as React from 'react'

export function MobileNav() {
  const [open, setOpen] = React.useState(false)
  const { profile, user, signOut } = useAuth()
  const label = profile?.display_name?.trim() || user?.email?.split('@')[0] || 'Member'
  const initials = getInitials(profile?.display_name, user?.email)

  return (
    <>
      <header className="flex items-center justify-between gap-3 border-b border-ink-600/25 bg-ink-800/80 px-4 py-3 backdrop-blur md:hidden">
        <Link to={ROUTES.dashboard} className="flex min-w-0 items-center gap-2.5">
          <BrandMark className="h-8 w-8 rounded-lg" />
          <span className="truncate text-sm font-semibold tracking-[0.08em] uppercase">{APP_NAME}</span>
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
          <nav className="absolute right-0 top-0 flex h-full w-72 flex-col border-l border-ink-600/25 bg-ink-800 shadow-xl">
            <div className="border-b border-ink-600/25 bg-gradient-to-b from-signal/10 to-transparent px-4 py-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <BrandMark className="h-8 w-8 rounded-lg" />
                  <span className="text-xs font-semibold tracking-[0.12em] uppercase text-foreground">Menu</span>
                </div>
                <Button variant="ghost" size="icon" onClick={() => { setOpen(false) }} aria-label="Close menu">
                  ×
                </Button>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-ink-600/30 bg-ink-800/80 p-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-ink-700 ring-2 ring-signal/25">
                  <span className="text-xs font-semibold">{initials}</span>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{label}</p>
                  {user?.email ? (
                    <p className="truncate text-[11px] text-muted-foreground">{user.email}</p>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3">
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
            </div>
            <div className="space-y-0.5 border-t border-ink-600/25 p-3">
              {profile?.is_admin ? (
                <NavLink
                  to={ROUTES.admin}
                  onClick={() => { setOpen(false) }}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm',
                      isActive ? 'bg-primary/10 font-medium text-primary' : 'text-muted-foreground',
                    )
                  }
                >
                  <ShieldCheck className="h-4 w-4" />
                  System Health
                </NavLink>
              ) : null}
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
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2.5 px-3 text-muted-foreground"
                onClick={() => {
                  setOpen(false)
                  void signOut()
                }}
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </Button>
            </div>
          </nav>
        </div>
      )}
    </>
  )
}
