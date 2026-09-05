import type { AuthContextValue } from '@/contexts/auth-context'

export function createMockAuth(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    user: null,
    session: null,
    profile: null,
    loading: false,
    isConfigured: true,
    isAuthenticated: false,
    signIn: () => Promise.resolve({ error: null }),
    signUp: () => Promise.resolve({ error: null }),
    signOut: () => Promise.resolve(),
    refreshProfile: () => Promise.resolve(),
    ...overrides,
  }
}
