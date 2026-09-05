import {
  Brain,
  Bookmark,
  Code2,
  GraduationCap,
  LayoutDashboard,
  Newspaper,
  Settings,
  Shield,
  Wrench,
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
  { label: 'AI', href: ROUTES.ai, icon: Brain },
  { label: 'Development', href: ROUTES.development, icon: Code2 },
  { label: 'Security', href: ROUTES.security, icon: Shield },
  { label: 'Tools', href: ROUTES.tools, icon: Wrench },
  { label: 'Learning', href: ROUTES.learning, icon: GraduationCap },
  { label: 'Saved', href: ROUTES.saved, icon: Bookmark },
]

export const settingsNavItem: NavItem = {
  label: 'Settings',
  href: ROUTES.settings,
  icon: Settings,
}
