import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../features/auth/auth.store';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../features/dashboard/analytics.api';
import { keys } from '../query/keys';
import { useOnboardingStatus } from '../features/onboarding/hooks/useOnboarding';

import { AdminDashboard } from './dashboard/AdminDashboard';
import { TailorDashboard } from './dashboard/TailorDashboard';
import { TailorDashboardEmpty } from './dashboard/TailorDashboardEmpty';
import { ClientDashboard } from './dashboard/ClientDashboard';
import { Box } from '@mui/material';
import { QueryLoading } from '../components/feedback/QueryState';

export const DashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const role = user?.role;

  // Hooks run on every render, before any early return; a system admin has no dashboard data to load
  const { data, isLoading } = useQuery({
    queryKey: keys.analytics.overview,
    queryFn: analyticsApi.getOverview,
    enabled: role !== 'SYSTEM_ADMIN',
  });
  // An owner whose business isn't set up yet starts in the setup wizard; other pages stay reachable
  const onboarding = useOnboardingStatus(role === 'OWNER');

  if (role === 'SYSTEM_ADMIN') {
    return <Navigate to="/system-admin" replace />;
  }

  if (role === 'OWNER' && onboarding.data && !onboarding.data.completedAt) {
    return <Navigate to="/onboarding" replace />;
  }

  if (isLoading || (role === 'OWNER' && onboarding.isLoading)) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <QueryLoading label="Loading dashboard…" />
      </Box>
    );
  }

  const hasOrders = (data?.totalActiveOrders || 0) > 0;

  if (role === 'TAILOR') {
    if (!hasOrders) return <TailorDashboardEmpty />;
    return <TailorDashboard />;
  }

  if (role === 'OWNER' || role === 'MANAGER') {
    return <AdminDashboard />;
  }

  if (role === 'CUSTOMER') {
    return <ClientDashboard />;
  }

  // Any other role sees the empty dashboard
  return <TailorDashboardEmpty />;
};
