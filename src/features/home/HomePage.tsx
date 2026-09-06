import { Link } from 'react-router-dom'
import { APP_MOTTO, APP_NAME, APP_TAGLINE, ROUTES } from '@/config/constants'
import { NexoraMark } from '@/components/brand/NexoraMark'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowRight, Brain, Radar, ShieldCheck, Zap } from 'lucide-react'

const pillars = [
  {
    icon: Radar,
    title: 'Continuous Discovery',
    description:
      'Monitor AI models, frameworks, tools, cloud services, security issues, and technical developments — without manual tracking.',
  },
  {
    icon: Brain,
    title: 'Intelligent Filtering',
    description:
      'Verify sources, understand technical significance, and rank relevance to your interests — not generic news noise.',
  },
  {
    icon: Zap,
    title: 'Timely Delivery',
    description:
      'Receive intelligence through Telegram and an optional web dashboard when something important happens.',
  },
  {
    icon: ShieldCheck,
    title: 'Trustworthy by Design',
    description:
      'External content is treated as untrusted data. Secrets stay server-side. RLS protects your data.',
  },
]

export function HomePage() {
  const { isAuthenticated } = useAuth()
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-12 px-4 py-10 sm:px-6 lg:py-16">
      <section className="flex flex-col gap-6">
        <Badge className="w-fit border-primary/20 bg-primary/5 text-primary">Personal Intelligence</Badge>
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <NexoraMark size={56} className="shadow-[0_0_32px_-8px] shadow-signal/60" />
            <h1 className="text-4xl font-semibold tracking-[0.08em] uppercase sm:text-5xl">
              {APP_NAME}
            </h1>
          </div>
          <p className="max-w-2xl text-lg text-muted-foreground">{APP_TAGLINE}</p>
          <p className="text-sm font-medium text-primary">{APP_MOTTO}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {isAuthenticated ? (
            <Button asChild>
              <Link to={ROUTES.dashboard}>
                Open Dashboard
                <ArrowRight />
              </Link>
            </Button>
          ) : (
            <>
              <Button asChild>
                <Link to={ROUTES.signup}>
                  Get Started
                  <ArrowRight />
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to={ROUTES.login}>Sign in</Link>
              </Button>
            </>
          )}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        {pillars.map((pillar) => (
          <Card key={pillar.title} className="border-border/60">
            <CardHeader>
              <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <pillar.icon className="h-4 w-4" />
              </div>
              <CardTitle className="text-base">{pillar.title}</CardTitle>
              <CardDescription>{pillar.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </section>

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base">Daily intelligence, where you work</CardTitle>
          <CardDescription>
            Nexora ingests tech news, filters noise, and explains what matters for developers — delivered
            on Telegram (recommended) or email each morning.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            1. Sign up and open <strong>Settings</strong> → link Telegram → enable morning digest.
          </p>
          <p>
            2. Optionally connect Gmail for the same digest in your inbox.
          </p>
          <p>
            3. Use <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">/brief</code> or{' '}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">/latest</code> in Telegram
            anytime for AI summaries with context.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
