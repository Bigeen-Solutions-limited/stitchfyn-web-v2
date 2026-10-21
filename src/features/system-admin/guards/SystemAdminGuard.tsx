import React from 'react'
import { Navigate } from 'react-router-dom'
import { Box, CircularProgress } from '@mui/material'
import { useAuthStore } from '../../auth/auth.store'

interface Props {
  children: React.ReactNode
}

// Signed-out visitors go to login like any protected page; a signed-in non-admin sees nothing, so the admin routes can't be discovered
export function SystemAdminGuard({ children }: Props) {
  const { user, isLoading } = useAuthStore()

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress size={28} />
      </Box>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'SYSTEM_ADMIN') return null

  return <>{children}</>
}
