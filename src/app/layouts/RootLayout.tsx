import { Outlet } from 'react-router-dom'
import { ThemeProvider } from '@/hooks/use-theme'
import { AuthProvider } from '@/contexts/auth-context'

export function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Outlet />
      </AuthProvider>
    </ThemeProvider>
  )
}
