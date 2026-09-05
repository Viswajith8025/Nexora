import type { ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { MobileNav } from './MobileNav'
import { SearchBar } from '@/features/articles/components/SearchBar'
import { SkipLink } from '@/components/a11y/SkipLink'

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <SkipLink />
      <MobileNav />
      <Sidebar />
      <div className="flex min-h-dvh flex-1 flex-col">
        <div className="hidden border-b bg-card/50 px-6 py-3 backdrop-blur md:block">
          <div className="mx-auto max-w-6xl">
            <SearchBar />
          </div>
        </div>
        <main id="main-content" className="flex-1 overflow-y-auto" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  )
}
