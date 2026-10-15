import { Outlet, Navigate, useLocation } from "react-router-dom"
import { useAuthStore } from "../../features/auth/auth.store"

// Signed-in users skip these; tracking and seal pages stay open so staff can preview them
const SIGN_IN_PATHS = ['/login', '/forgot-password']

export function PublicLayout() {
  const { isAuthenticated, isLoading, user } = useAuthStore()
  const location = useLocation()

  // Wait for the session check before redirecting, except on the splash screen
  if (isLoading && location.pathname !== '/') {
    return <div>Loading...</div>
  }

  if (isAuthenticated && SIGN_IN_PATHS.includes(location.pathname)) {
    return <Navigate to={user?.role === 'SYSTEM_ADMIN' ? '/system-admin' : '/dashboard'} replace />
  }

  return (
    <main className="public-layout">
      <Outlet />
    </main>
  )
}
