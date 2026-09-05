import type { ContentCategory } from '@/types/database'

export const CATEGORY_STYLES: Record<ContentCategory, string> = {
  AI: 'bg-violet-500/10 text-violet-700 dark:text-violet-300',
  Development: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
  Cloud: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
  Security: 'bg-red-500/10 text-red-700 dark:text-red-300',
  'Developer Tools': 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  Databases: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  'Technology Industry': 'bg-slate-500/10 text-slate-700 dark:text-slate-300',
}

export function categoryLabel(category: ContentCategory | null): string {
  if (!category) return 'General'
  return category
}
