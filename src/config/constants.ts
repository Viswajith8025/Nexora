export const APP_NAME = 'Nexora'
export const APP_TAGLINE = 'Personal Technology Intelligence'
export const APP_MOTTO = 'Discover. Understand. Stay Ahead.'

export const ROUTES = {
  home: '/',
  dashboard: '/dashboard',
  news: '/news',
  newsDetail: (id: string) => `/news/${id}`,
  ai: '/ai',
  development: '/development',
  security: '/security',
  tools: '/tools',
  learning: '/learning',
  saved: '/saved',
  search: '/search',
  settings: '/settings',
  admin: '/admin',
  login: '/login',
  signup: '/signup',
} as const

export const NAV_ITEMS = [
  { label: 'Dashboard', href: ROUTES.dashboard, icon: 'LayoutDashboard' },
  { label: 'News', href: ROUTES.news, icon: 'Newspaper' },
  { label: 'AI', href: ROUTES.ai, icon: 'Brain' },
  { label: 'Development', href: ROUTES.development, icon: 'Code2' },
  { label: 'Security', href: ROUTES.security, icon: 'Shield' },
  { label: 'Tools', href: ROUTES.tools, icon: 'Wrench' },
  { label: 'Learning', href: ROUTES.learning, icon: 'GraduationCap' },
  { label: 'Saved', href: ROUTES.saved, icon: 'Bookmark' },
  { label: 'Settings', href: ROUTES.settings, icon: 'Settings' },
] as const
