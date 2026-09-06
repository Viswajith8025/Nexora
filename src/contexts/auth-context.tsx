import * as React from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { getSupabaseClientOrNull } from '@/lib/supabase'
import type { Profile } from '@/types/database'
import type { LoginInput, SignupInput } from '@/schemas/auth'
import { mapAuthError } from '@/lib/auth-errors'

export type AuthContextValue = {
  user: User | null
  session: Session | null
  profile: Profile | null
  loading: boolean
  isConfigured: boolean
  isAuthenticated: boolean
  signIn: (input: LoginInput) => Promise<{ error: string | null }>
  signUp: (input: SignupInput) => Promise<{ error: string | null; needsEmailConfirmation?: boolean }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = React.createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = getSupabaseClientOrNull()
  const isConfigured = supabase !== null

  const [user, setUser] = React.useState<User | null>(null)
  const [session, setSession] = React.useState<Session | null>(null)
  const [profile, setProfile] = React.useState<Profile | null>(null)
  const [loading, setLoading] = React.useState(isConfigured)

  const fetchProfile = React.useCallback(
    async (userId: string) => {
      if (!supabase) return null

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (error) {
        console.error('Failed to fetch profile:', error.message)
        return null
      }

      return data
    },
    [supabase],
  )

  const refreshProfile = React.useCallback(async () => {
    if (!user) {
      setProfile(null)
      return
    }
    const nextProfile = await fetchProfile(user.id)
    setProfile(nextProfile)
  }, [fetchProfile, user])

  React.useEffect(() => {
    if (!supabase) return

    let mounted = true

    void supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return
      const nextSession = data.session
      setSession(nextSession)
      setUser(nextSession?.user ?? null)
      if (nextSession?.user) {
        const nextProfile = await fetchProfile(nextSession.user.id)
        if (mounted) setProfile(nextProfile)
      }
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setUser(nextSession?.user ?? null)
      if (nextSession?.user) {
        void fetchProfile(nextSession.user.id).then((nextProfile) => {
          if (mounted) setProfile(nextProfile)
        })
      } else {
        setProfile(null)
      }
      setLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [supabase, fetchProfile])

  const signIn = React.useCallback(
    async (input: LoginInput) => {
      if (!supabase) {
        return { error: 'Supabase is not configured' }
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: input.email,
        password: input.password,
      })

      return { error: error ? mapAuthError(error.message) : null }
    },
    [supabase],
  )

  const signUp = React.useCallback(
    async (input: SignupInput) => {
      if (!supabase) {
        return { error: 'Supabase is not configured' }
      }

      const { data, error } = await supabase.auth.signUp({
        email: input.email,
        password: input.password,
        options: {
          data: {
            display_name: input.displayName,
          },
        },
      })

      if (error) {
        return { error: mapAuthError(error.message) }
      }

      if (!data.session) {
        return { error: null, needsEmailConfirmation: true }
      }

      return { error: null }
    },
    [supabase],
  )

  const signOut = React.useCallback(async () => {
    if (!supabase) return
    await supabase.auth.signOut()
    setProfile(null)
  }, [supabase])

  const value = React.useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      profile,
      loading: isConfigured ? loading : false,
      isConfigured,
      isAuthenticated: !!user,
      signIn,
      signUp,
      signOut,
      refreshProfile,
    }),
    [user, session, profile, loading, isConfigured, signIn, signUp, signOut, refreshProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = React.useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
