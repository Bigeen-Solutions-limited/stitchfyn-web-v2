import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './auth.store';
import { usePermissions } from './use-permissions';
import type { Capability, StitchFynRole } from './auth.types';

interface ProtectedRouteProps {
  requiredPermission?: Capability;
  allowedRoles?: StitchFynRole[];
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  requiredPermission,
  allowedRoles,
  children,
}) => {
  const { isAuthenticated, isLoading, user } = useAuthStore();
  const { hasCapability } = usePermissions();
  const location = useLocation();

  // Still checking the session
  if (isLoading) {
    return (
      <div className="full-screen-skeleton">
        <div className="loading-spinner">Loading Stitchfyn...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // A required password change blocks every other page
  if (user?.mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  // Missing permission looks like a missing page
  if (requiredPermission && !hasCapability(requiredPermission as any)) {
    return <Navigate to="/404" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    const fallback = user.role === 'TAILOR' ? '/production' : '/dashboard';
    return <Navigate to={fallback} replace />;
  }

  return <>{children}</>;
};
