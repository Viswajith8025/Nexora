import { NavLink } from 'react-router-dom'
import { LogOut, ShieldCheck } from 'lucide-react'
import { APP_NAME, APP_TAGLINE, ROUTES } from '@/config/constants'
import { primaryNavItems, settingsNavItem } from '@/config/navigation'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function Sidebar() {
  const { profile, user, signOut } = useAuth()

  return (
    <aside className="hidden h-full w-60 flex-col border-r bg-card/50 md:flex">
      <div className="flex flex-col gap-1 border-b px-4 py-5">
        <span className="text-sm font-semibold tracking-wide">{APP_NAME}</span>
        <span className="text-xs text-muted-foreground">{APP_TAGLINE}</span>
        {(profile?.display_name ?? user?.email) && (
          <span className="mt-2 truncate text-xs text-muted-foreground">
            {profile?.display_name ?? user?.email}
          </span>
        )}
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-3">
        {primaryNavItems.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-primary/10 font-medium text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              )
            }
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="space-y-1 border-t p-3">
        {profile?.is_admin ? (
          <NavLink
            to={ROUTES.admin}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-primary/10 font-medium text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              )
            }
          >
            <ShieldCheck className="h-4 w-4 shrink-0" />
            System Health
          </NavLink>
        ) : null}
        <NavLink
          to={settingsNavItem.href}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors',
              isActive
                ? 'bg-primary/10 font-medium text-primary'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            )
          }
        >
          <settingsNavItem.icon className="h-4 w-4 shrink-0" />
          {settingsNavItem.label}
        </NavLink>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2.5 px-3 text-muted-foreground"
          onClick={() => { void signOut() }}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    </aside>
  )
}
