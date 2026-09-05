import { hasClientEnv } from '@/lib/config/env'
import { useAuth } from '@/hooks/use-auth'
import { useTheme } from '@/hooks/use-theme'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Moon, Sun, Monitor } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PersonalizationSettings } from '@/features/personalization/components/PersonalizationSettings'

export function SettingsPage() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const { user, profile, loading, isConfigured, signOut } = useAuth()
  const supabaseConfigured = hasClientEnv()

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Personalization, notifications, and preferences — transparent scoring, no black-box ML.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Appearance</CardTitle>
          <CardDescription>Theme preference for the Nexora interface.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
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
          </div>
          <p className="text-xs text-muted-foreground">Active theme: {resolvedTheme}</p>
        </CardContent>
      </Card>

      <PersonalizationSettings />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Supabase</CardTitle>
          <CardDescription>Backend connection status.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm">Client configuration</span>
            <Badge className={supabaseConfigured ? 'border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400' : ''}>
              {supabaseConfigured ? 'Configured' : 'Not configured'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
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
