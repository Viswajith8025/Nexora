import { useEffect, useState } from 'react'
import { PageContainer } from '@/components/layout/PageContainer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ErrorState } from '@/components/states/ErrorState'
import { LoadingRegion } from '@/components/states/LoadingRegion'
import { hasClientEnv } from '@/lib/config/env'
import { fetchSystemHealth, type SystemHealth } from '@/features/admin/api/health'

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-ink-800 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  )
}

export function AdminHealthPage() {
  const [health, setHealth] = useState<SystemHealth | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  function load() {
    setLoading(true)
    setError(null)
    void fetchSystemHealth()
      .then(setHealth)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load system health')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  return (
    <PageContainer wide>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">System Health</h1>
        <p className="text-sm text-muted-foreground">Admin-only operational overview.</p>
      </header>

      <LoadingRegion loading={loading} label="Loading system health">
        {error ? (
          <ErrorState type="generic" description={error} onRetry={load} />
        ) : health ? (
          <div className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Metric label="Supabase client" value={hasClientEnv() ? 'Configured' : 'Missing'} />
              <Metric label="Articles today" value={health.articlesProcessedToday} />
              <Metric label="Notifications today" value={health.notificationsSentToday} />
              <Metric label="AI calls today" value={health.aiUsage.calls} />
              <Metric label="AI failures" value={health.aiUsage.failures} />
            </div>

            <Card>
              <CardHeader><CardTitle className="text-base">Pipeline</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>Last ingestion: {health.lastIngestion?.completed_at ?? '—'} ({health.lastIngestion?.status ?? 'n/a'})</p>
                <p>Last AI processing: {health.lastAiProcessing?.completed_at ?? '—'}</p>
                <p>Last Telegram delivery: {health.lastTelegramDelivery ?? '—'}</p>
                <p>Last Gmail delivery: {health.lastGmailDelivery ?? '—'}</p>
                <p>Avg AI duration: {health.aiUsage.avgDurationMs}ms</p>
              </CardContent>
            </Card>

            {health.failedSources.length > 0 ? (
              <Card>
                <CardHeader><CardTitle className="text-base">Failed sources</CardTitle></CardHeader>
                <CardContent>
                  <ul className="space-y-1 text-sm">
                    {health.failedSources.map((source: SystemHealth['failedSources'][number]) => (
                      <li key={source.name}>{source.name}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ) : null}

            {health.failedJobs.length > 0 ? (
              <Card>
                <CardHeader><CardTitle className="text-base">Failed jobs</CardTitle></CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    {health.failedJobs.map((job: SystemHealth['failedJobs'][number]) => (
                      <li key={`${job.job_name}-${job.completed_at}`}>
                        {job.job_name}: {job.error ?? 'unknown error'}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ) : null}
          </div>
        ) : null}
      </LoadingRegion>
    </PageContainer>
  )
}
