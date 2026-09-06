export function mapAuthError(message: string): string {
  const normalized = message.toLowerCase()

  if (normalized.includes('invalid login credentials')) {
    return 'Wrong email or password. Create an account first if you have not signed up yet.'
  }

  if (normalized.includes('email not confirmed')) {
    return 'Confirm your email before signing in. Check your inbox for the Supabase confirmation link.'
  }

  if (normalized.includes('user already registered')) {
    return 'An account with this email already exists. Try signing in instead.'
  }

  if (normalized.includes('password should be at least')) {
    return 'Password must be at least 6 characters.'
  }

  if (normalized.includes('unable to validate email address')) {
    return 'Enter a valid email address.'
  }

  return message
}
