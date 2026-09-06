import {
  Bookmark,
  GraduationCap,
  LayoutDashboard,
  Newspaper,
  Settings,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { ROUTES } from '@/config/constants'

export type NavItem = {
  label: string
  href: string
  icon: LucideIcon
}

export const primaryNavItems: NavItem[] = [
  { label: 'Dashboard', href: ROUTES.dashboard, icon: LayoutDashboard },
  { label: 'News', href: ROUTES.news, icon: Newspaper },
  { label: 'Learning', href: ROUTES.learning, icon: GraduationCap },
  { label: 'Saved', href: ROUTES.saved, icon: Bookmark },
]

export const settingsNavItem: NavItem = {
  label: 'Settings',
  href: ROUTES.settings,
  icon: Settings,
}
