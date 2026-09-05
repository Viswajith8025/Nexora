import { Link, useNavigate } from 'react-router-dom'
import { useState, type SubmitEvent } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { loginSchema, type LoginInput } from '@/schemas/auth'
import { ROUTES, APP_NAME, APP_TAGLINE } from '@/config/constants'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState<LoginInput>({ email: '', password: '' })
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    const parsed = loginSchema.safeParse(form)
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid input')
      return
    }

    setSubmitting(true)
    const result = await signIn(parsed.data)
    setSubmitting(false)

    if (result.error) {
      setError(result.error)
      return
    }

    void navigate(ROUTES.dashboard, { replace: true })
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>{APP_NAME}</CardTitle>
          <CardDescription>{APP_TAGLINE}</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={(e) => { void handleSubmit(e) }}>
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={(e) => { setForm((prev) => ({ ...prev, email: e.target.value })) }}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={form.password}
                onChange={(e) => { setForm((prev) => ({ ...prev, password: e.target.value })) }}
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            No account?{' '}
            <Link to={ROUTES.signup} className="text-primary hover:underline">
              Create one
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
