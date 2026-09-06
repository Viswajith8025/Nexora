import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { ContentCategory } from '@/types/database'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TagInput } from '@/features/personalization/components/TagInput'
import {
  fetchFollowedTopics,
  fetchUserInterests,
  replaceFollowedTopics,
  replaceInterestsByType,
} from '@/features/personalization/api/interests'
import { updateProfileSettings } from '@/features/personalization/api/profile'
import { disconnectGmail, startGmailOAuth } from '@/features/admin/api/health'
import {
  buildTelegramStartUrl,
  createTelegramLinkToken,
  getTelegramBotUsername,
} from '@/features/personalization/api/telegram'
import { previewMorningDigest } from '@/features/personalization/api/digest-preview'

const CATEGORIES: ContentCategory[] = [
  'AI',
  'Development',
  'Cloud',
  'Security',
  'Developer Tools',
  'Databases',
  'Technology Industry',
]

const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Berlin',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
]

export function PersonalizationSettings() {
  const { user, profile, refreshProfile } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [categories, setCategories] = useState<string[]>([])
  const [technologies, setTechnologies] = useState<string[]>([])
  const [companies, setCompanies] = useState<string[]>([])
  const [topics, setTopics] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [linkToken, setLinkToken] = useState<string | null>(null)
  const [linkExpiresAt, setLinkExpiresAt] = useState<string | null>(null)
  const [digestPreview, setDigestPreview] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [threshold, setThreshold] = useState(55)
  const [morningHour, setMorningHour] = useState(8)
  const [eveningHour, setEveningHour] = useState(19)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const botUsername = getTelegramBotUsername()

  useEffect(() => {
    if (!user) return
    void fetchUserInterests(user.id).then((interests) => {
      setCategories(interests.filter((item) => item.interest_type === 'category').map((item) => item.value))
      setTechnologies(interests.filter((item) => item.interest_type === 'technology').map((item) => item.value))
      setCompanies(interests.filter((item) => item.interest_type === 'company').map((item) => item.value))
    })
    void fetchFollowedTopics(user.id).then(setTopics)
  }, [user?.id])

  useEffect(() => {
    if (!profile) return
    setThreshold(profile.notification_threshold ?? 55)
    setMorningHour(profile.morning_digest_hour ?? 8)
    setEveningHour(profile.evening_digest_hour ?? 19)
  }, [profile])

  useEffect(() => {
    if (searchParams.get('gmail') === 'connected') {
      setMessage('Gmail connected successfully. Digests will also be sent to your inbox.')
      void refreshProfile()
      const next = new URLSearchParams(searchParams)
      next.delete('gmail')
      setSearchParams(next, { replace: true })
    }
  }, [searchParams, setSearchParams, refreshProfile])

  async function connectGmail() {
    setSaving(true)
    setMessage(null)
    try {
      const authUrl = await startGmailOAuth()
      window.location.href = authUrl
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to start Gmail connection')
      setSaving(false)
    }
  }

  async function handleDisconnectGmail() {
    if (!user) return
    if (!window.confirm('Disconnect Gmail from Nexora digests?')) return
    setSaving(true)
    setMessage(null)
    try {
      await disconnectGmail(user.id)
      await refreshProfile()
      setMessage('Gmail disconnected.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to disconnect Gmail')
    } finally {
      setSaving(false)
    }
  }

  async function saveInterests() {
    if (!user) return
    setSaving(true)
    setMessage(null)
    try {
      await Promise.all([
        replaceInterestsByType(user.id, 'category', categories),
        replaceInterestsByType(user.id, 'technology', technologies),
        replaceInterestsByType(user.id, 'company', companies),
        replaceFollowedTopics(user.id, topics),
      ])
      setMessage('Interests saved. Future scoring will reflect these preferences.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to save interests')
    } finally {
      setSaving(false)
    }
  }

  async function saveProfile(updates: Parameters<typeof updateProfileSettings>[1]) {
    if (!user) return
    setSaving(true)
    setMessage(null)
    try {
      await updateProfileSettings(user.id, updates)
      await refreshProfile()
      setMessage('Settings updated.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const scheduleProfileSave = useCallback(
    (updates: Parameters<typeof updateProfileSettings>[1]) => {
      if (!user) return
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => {
        void (async () => {
          setSaving(true)
          setMessage(null)
          try {
            await updateProfileSettings(user.id, updates)
            await refreshProfile()
          } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Failed to save settings')
          } finally {
            setSaving(false)
          }
        })()
      }, 400)
    },
    [user, refreshProfile],
  )

  async function generateTelegramLink() {
    if (!user) return
    setSaving(true)
    setMessage(null)
    try {
      const result = await createTelegramLinkToken(user.id)
      setLinkToken(result.token)
      setLinkExpiresAt(result.expiresAt)
      setMessage('Link token generated. Open Telegram within 15 minutes.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to generate Telegram link')
    } finally {
      setSaving(false)
    }
  }

  async function copyTelegramCommand() {
    if (!linkToken) return
    const command = `/start ${linkToken}`
    await navigator.clipboard.writeText(command)
    setMessage('Copied /start command. Paste it in your Telegram chat with the Nexora bot.')
  }

  if (!user || !profile) {
    return (
      <Card>
        <CardContent className="py-6 text-sm text-muted-foreground">Sign in to configure personalization.</CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Interests</CardTitle>
          <CardDescription>Transparent scoring uses these to boost matching stories.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <p className="text-sm font-medium">Categories</p>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((category) => {
                const active = categories.includes(category)
                return (
                  <Button
                    key={category}
                    type="button"
                    size="sm"
                    variant={active ? 'default' : 'outline'}
                    onClick={() => {
                      setCategories((current) =>
                        active ? current.filter((item) => item !== category) : [...current, category],
                      )
                    }}
                  >
                    {category}
                  </Button>
                )
              })}
            </div>
          </div>

          <TagInput
            label="Technologies"
            description="Frameworks, languages, and tools you care about."
            values={technologies}
            onChange={setTechnologies}
            placeholder="e.g. react, postgres, rust"
          />

          <TagInput
            label="Companies"
            description="Vendors and organizations to track."
            values={companies}
            onChange={setCompanies}
            placeholder="e.g. OpenAI, Vercel"
          />

          <TagInput
            label="Topics"
            description="Broader themes followed for topic relevance."
            values={topics}
            onChange={setTopics}
            placeholder="e.g. llm, devops"
          />

          <Button onClick={() => { void saveInterests() }} disabled={saving}>
            {saving ? 'Saving…' : 'Save interests'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notifications</CardTitle>
          <CardDescription>Control when and how Nexora reaches you.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="threshold">Notification threshold ({threshold})</Label>
            <input
              id="threshold"
              type="range"
              min={30}
              max={90}
              step={5}
              value={threshold}
              onChange={(event) => {
                const value = Number(event.target.value)
                setThreshold(value)
                scheduleProfileSave({ notification_threshold: value })
              }}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Only stories scoring above this threshold are eligible for digests and alerts.
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={previewLoading}
              onClick={() => {
                setPreviewLoading(true)
                void previewMorningDigest(threshold)
                  .then(setDigestPreview)
                  .catch((error: unknown) => {
                    setDigestPreview(error instanceof Error ? error.message : 'Preview failed')
                  })
                  .finally(() => setPreviewLoading(false))
              }}
            >
              {previewLoading ? 'Generating…' : "Preview tomorrow's morning digest"}
            </Button>
            {digestPreview ? (
              <pre className="max-h-64 overflow-auto rounded-lg bg-ink-700/60 p-3 text-xs whitespace-pre-wrap text-muted-foreground">
                {digestPreview}
              </pre>
            ) : null}
          </div>

          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="breaking">Breaking alerts</Label>
            <Switch
              id="breaking"
              checked={profile.breaking_alerts_enabled}
              onCheckedChange={(checked) => { void saveProfile({ breaking_alerts_enabled: checked }) }}
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="morning">Morning digest</Label>
            <Switch
              id="morning"
              checked={profile.morning_digest_enabled}
              onCheckedChange={(checked) => { void saveProfile({ morning_digest_enabled: checked }) }}
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="evening">Evening digest</Label>
            <Switch
              id="evening"
              checked={profile.evening_digest_enabled}
              onCheckedChange={(checked) => { void saveProfile({ evening_digest_enabled: checked }) }}
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="weekly">Weekly digest</Label>
            <Switch
              id="weekly"
              checked={profile.weekly_digest_enabled}
              onCheckedChange={(checked) => { void saveProfile({ weekly_digest_enabled: checked }) }}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="morning-hour">Morning digest hour</Label>
              <Input
                id="morning-hour"
                type="number"
                min={0}
                max={23}
                value={morningHour}
                onChange={(event) => {
                  const value = Number(event.target.value)
                  setMorningHour(value)
                  scheduleProfileSave({ morning_digest_hour: value })
                }}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="evening-hour">Evening digest hour</Label>
              <Input
                id="evening-hour"
                type="number"
                min={0}
                max={23}
                value={eveningHour}
                onChange={(event) => {
                  const value = Number(event.target.value)
                  setEveningHour(value)
                  scheduleProfileSave({ evening_digest_hour: value })
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Delivery channels</CardTitle>
          <CardDescription>
            Telegram is the fastest way to get daily developer intelligence. Email is optional.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <Label>Telegram (recommended)</Label>
                <p className="text-xs text-muted-foreground">
                  {profile.telegram_chat_id
                    ? 'Linked — morning digest and /brief, /latest, /learn in Telegram'
                    : 'Link once, then get daily digests and on-demand briefings'}
                </p>
              </div>
              <Switch
                id="telegram"
                checked={profile.telegram_enabled}
                disabled={!profile.telegram_chat_id}
                onCheckedChange={(checked) => { void saveProfile({ telegram_enabled: checked }) }}
              />
            </div>

            {!profile.telegram_chat_id ? (
              <div className="space-y-2">
                <Button type="button" size="sm" onClick={() => { void generateTelegramLink() }} disabled={saving}>
                  Generate link token
                </Button>
                {linkToken ? (
                  <div className="space-y-2 text-sm">
                    <p className="font-mono text-xs break-all rounded bg-background px-2 py-1">{linkToken}</p>
                    <p className="text-xs text-muted-foreground">
                      Expires {linkExpiresAt ? new Date(linkExpiresAt).toLocaleTimeString() : 'soon'}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => { void copyTelegramCommand() }}>
                        Copy /start command
                      </Button>
                      {buildTelegramStartUrl(linkToken, botUsername) ? (
                        <Button type="button" size="sm" asChild>
                          <a
                            href={buildTelegramStartUrl(linkToken, botUsername) ?? '#'}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Open in Telegram
                          </a>
                        </Button>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          Set <code className="font-mono">VITE_TELEGRAM_BOT_USERNAME</code> for one-tap open.
                        </p>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      In Telegram, send <span className="font-mono">/start {linkToken}</span> to your Nexora bot.
                    </p>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Label htmlFor="gmail">Gmail (optional)</Label>
              <p className="text-xs text-muted-foreground">
                {profile.gmail_address
                  ? `Connected as ${profile.gmail_address}`
                  : 'Receive morning, evening, and weekly digests by email'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {profile.gmail_address ? (
                <>
                  <Switch
                    id="gmail"
                    checked={profile.gmail_enabled}
                    onCheckedChange={(checked) => { void saveProfile({ gmail_enabled: checked }) }}
                  />
                  <Button type="button" variant="outline" size="sm" onClick={() => { void handleDisconnectGmail() }} disabled={saving}>
                    Disconnect
                  </Button>
                </>
              ) : (
                <Button type="button" size="sm" onClick={() => { void connectGmail() }} disabled={saving}>
                  Connect Gmail
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Timezone & quiet hours</CardTitle>
          <CardDescription>Used for digest scheduling and breaking alert quiet periods.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="timezone">Timezone</Label>
            <select
              id="timezone"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={profile.timezone}
              onChange={(event) => { void saveProfile({ timezone: event.target.value }) }}
            >
              {TIMEZONES.map((timezone) => (
                <option key={timezone} value={timezone}>{timezone}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="quiet-hours">Quiet hours</Label>
            <Switch
              id="quiet-hours"
              checked={profile.quiet_hours_enabled}
              onCheckedChange={(checked) => { void saveProfile({ quiet_hours_enabled: checked }) }}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="quiet-start">Quiet start</Label>
              <Input
                id="quiet-start"
                type="time"
                value={profile.quiet_hours_start?.slice(0, 5) ?? '22:00'}
                disabled={!profile.quiet_hours_enabled}
                onChange={(event) => { void saveProfile({ quiet_hours_start: `${event.target.value}:00` }) }}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="quiet-end">Quiet end</Label>
              <Input
                id="quiet-end"
                type="time"
                value={profile.quiet_hours_end?.slice(0, 5) ?? '07:00'}
                disabled={!profile.quiet_hours_enabled}
                onChange={(event) => { void saveProfile({ quiet_hours_end: `${event.target.value}:00` }) }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
