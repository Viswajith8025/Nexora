// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { createOAuthState, parseOAuthState } from '../../supabase/functions/_shared/security/oauth-state.ts'

describe('OAuth state signing', () => {
  const secret = 'test-signing-secret'

  it('creates and verifies signed state', async () => {
    const state = await createOAuthState('user-abc', secret)
    const userId = await parseOAuthState(state, secret)
    expect(userId).toBe('user-abc')
  })

  it('rejects tampered state', async () => {
    const state = await createOAuthState('user-abc', secret)
    const tampered = `${state.slice(0, -4)}xxxx`
    expect(await parseOAuthState(tampered, secret)).toBeNull()
  })

  it('rejects wrong secret', async () => {
    const state = await createOAuthState('user-abc', secret)
    expect(await parseOAuthState(state, 'wrong-secret')).toBeNull()
  })

  it('rejects raw user id as state', async () => {
    expect(await parseOAuthState('user-abc', secret)).toBeNull()
  })
})
