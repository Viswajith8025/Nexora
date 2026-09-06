import { NavLink } from 'react-router-dom'
import { LogOut, ShieldCheck } from 'lucide-react'
import { ROUTES } from '@/config/constants'
import { primaryNavItems, settingsNavItem } from '@/config/navigation'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { SidebarHeader } from '@/components/layout/SidebarHeader'
import { cn } from '@/lib/utils'

const navLinkClass = (isActive: boolean) =>
  cn(
    'group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all',
    isActive
      ? 'bg-signal/10 font-medium text-signal shadow-[inset_2px_0_0_0] shadow-signal'
      : 'text-muted-foreground hover:bg-ink-700/60 hover:text-foreground',
  )

export function Sidebar() {
  const { profile, user, signOut } = useAuth()

  return (
    <aside className="hidden h-full w-64 shrink-0 flex-col border-r border-ink-600/20 bg-ink-800/40 md:flex">
      <SidebarHeader displayName={profile?.display_name} email={user?.email} />

      <nav className="flex flex-1 flex-col gap-0.5 p-3">
        <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
          Menu
        </p>
        {primaryNavItems.map((item) => (
          <NavLink key={item.href} to={item.href} className={({ isActive }) => navLinkClass(isActive)}>
            <item.icon className="h-4 w-4 shrink-0 opacity-80 group-hover:opacity-100" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="space-y-0.5 border-t border-ink-600/25 p-3">
        <p className="px-3 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
          Account
        </p>
        {profile?.is_admin ? (
          <NavLink to={ROUTES.admin} className={({ isActive }) => navLinkClass(isActive)}>
            <ShieldCheck className="h-4 w-4 shrink-0" />
            System Health
          </NavLink>
        ) : null}
        <NavLink to={settingsNavItem.href} className={({ isActive }) => navLinkClass(isActive)}>
          <settingsNavItem.icon className="h-4 w-4 shrink-0" />
          {settingsNavItem.label}
        </NavLink>
        <Button
          variant="ghost"
          size="sm"
          className="mt-1 w-full justify-start gap-2.5 rounded-lg px-3 text-muted-foreground hover:bg-ink-700/60 hover:text-foreground"
          onClick={() => { void signOut() }}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    </aside>
  )
}
