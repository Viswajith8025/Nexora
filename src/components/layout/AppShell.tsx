import type { ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { MobileNav } from './MobileNav'
import { SkipLink } from '@/components/a11y/SkipLink'
import { CommandPaletteProvider } from '@/components/command-palette/CommandPalette'
import { ToastProvider } from '@/contexts/toast-context'
import { Search } from 'lucide-react'
import { useCommandPalette } from '@/components/command-palette/CommandPalette'
import { Button } from '@/components/ui/button'

function PaletteTrigger() {
  const { setOpen } = useCommandPalette()
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="hidden gap-2 text-muted-foreground md:inline-flex"
      onClick={() => { setOpen(true) }}
    >
      <Search className="h-4 w-4" />
      <span>Search</span>
      <kbd className="rounded bg-ink-700 px-1.5 py-0.5 text-[10px]">⌘K</kbd>
    </Button>
  )
}

function AppShellInner({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <SkipLink />
      <MobileNav />
      <Sidebar />
      <div className="flex min-h-dvh flex-1 flex-col">
        <div className="hidden items-center justify-end bg-ink-800/50 px-6 py-2 md:flex">
          <div className="mx-auto flex w-full max-w-6xl justify-end">
            <PaletteTrigger />
          </div>
        </div>
        <main id="main-content" className="flex-1 overflow-y-auto" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  )
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <CommandPaletteProvider>
        <AppShellInner>{children}</AppShellInner>
      </CommandPaletteProvider>
    </ToastProvider>
  )
}
