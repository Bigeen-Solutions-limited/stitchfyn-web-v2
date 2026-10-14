import React from 'react'
import { useAuthStore } from '../../auth/auth.store'

interface Props {
  children: React.ReactNode
}

// Shows nothing at all to anyone but a system admin, so the admin routes can't be discovered
export function SystemAdminGuard({ children }: Props) {
  const { user, isLoading } = useAuthStore()

  if (isLoading) return null
  if (!user || user.role !== 'SYSTEM_ADMIN') return null

  return <>{children}</>
}
