import { Link, useNavigate } from 'react-router-dom'
import { useState, type SubmitEvent } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { signupSchema, type SignupInput } from '@/schemas/auth'
import { ROUTES, APP_NAME, APP_TAGLINE } from '@/config/constants'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function SignupPage() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState<SignupInput>({
    displayName: '',
    email: '',
    password: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    const parsed = signupSchema.safeParse(form)
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid input')
      return
    }

    setSubmitting(true)
    const result = await signUp(parsed.data)
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
          <CardTitle>Create your {APP_NAME} account</CardTitle>
          <CardDescription>{APP_TAGLINE}</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={(e) => { void handleSubmit(e) }}>
            <div className="flex flex-col gap-2">
              <Label htmlFor="displayName">Display name</Label>
              <Input
                id="displayName"
                autoComplete="name"
                value={form.displayName}
                onChange={(e) => { setForm((prev) => ({ ...prev, displayName: e.target.value })) }}
                required
              />
            </div>
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
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => { setForm((prev) => ({ ...prev, password: e.target.value })) }}
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Creating account…' : 'Create account'}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link to={ROUTES.login} className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
