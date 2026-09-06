import { useAuth } from '@/hooks/use-auth'
import { useTheme } from '@/hooks/use-theme'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Moon, Sun, Monitor } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PersonalizationSettings } from '@/features/personalization/components/PersonalizationSettings'

export function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const { user, profile, loading, isConfigured, signOut } = useAuth()

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>

      <Card className="border-0 bg-ink-800">
        <CardHeader>
          <CardTitle className="text-base">Appearance</CardTitle>
          <CardDescription>Theme preference for the Nexora interface.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button
            variant={theme === 'light' ? 'default' : 'outline'}
            size="sm"
            onClick={() => { setTheme('light') }}
          >
            <Sun />
            Light
          </Button>
          <Button
            variant={theme === 'dark' ? 'default' : 'outline'}
            size="sm"
            onClick={() => { setTheme('dark') }}
          >
            <Moon />
            Dark
          </Button>
          <Button
            variant={theme === 'system' ? 'default' : 'outline'}
            size="sm"
            onClick={() => { setTheme('system') }}
          >
            <Monitor />
            System
          </Button>
        </CardContent>
      </Card>

      <PersonalizationSettings />

      <Card className="border-0 bg-ink-800">
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
          <CardDescription>Your Nexora profile and session.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {!isConfigured ? (
            <p className="text-sm text-muted-foreground">Configure Supabase to enable authentication.</p>
          ) : loading ? (
            <p className="text-sm text-muted-foreground">Checking session…</p>
          ) : user ? (
            <>
              <p className="text-sm">
                Signed in as <span className="font-medium">{profile?.display_name ?? user.email}</span>
              </p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
              <Button variant="outline" size="sm" className="w-fit" onClick={() => { void signOut() }}>
                Sign out
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Not signed in.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
