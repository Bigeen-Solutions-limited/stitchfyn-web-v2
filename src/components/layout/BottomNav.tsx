import React, { useState } from 'react';
import {
  Paper,
  BottomNavigation,
  BottomNavigationAction,
  Box,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Assignment as OrdersIcon,
  People as CustomersIcon,
  MoreHoriz as MoreIcon,
  Factory as ProductionIcon
} from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';
import { MoreDrawer } from './MoreDrawer';
import { useAuthStore } from '../../features/auth/auth.store';

export const BottomNav: React.FC = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const role = useAuthStore((state) => state.user?.role);

  if (!isMobile) return null;

  // Same role rules as the sidebar: order and client pages need MANAGE_ORDERS, which tailors lack
  const tabs = [
    { path: '/dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
    { path: '/orders', label: 'Orders', icon: <OrdersIcon />, roles: ['OWNER', 'MANAGER', 'FRONT_DESK'] },
    { path: '/production', label: 'Production', icon: <ProductionIcon /> },
    { path: '/customers', label: 'Clients', icon: <CustomersIcon />, roles: ['OWNER', 'MANAGER', 'FRONT_DESK'] },
  ].filter(tab => !tab.roles || (role && tab.roles.includes(role)));

  // Other pages highlight "More" through the drawer
  const activeTab = tabs.find(tab => tab.path === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(tab.path))?.path ?? false;

  const handleTabChange = (_event: React.SyntheticEvent, newValue: string) => {
    if (newValue === 'more') {
      setDrawerOpen(true);
      return;
    }
    navigate(newValue);
  };

  return (
    <Box sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1100 }}>
      <Paper
        elevation={3}
        sx={{
          borderRadius: 0,
          borderTop: '1px solid',
          borderColor: 'divider',
          pb: 'env(safe-area-inset-bottom)',
          bgcolor: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
        }}
      >
        <BottomNavigation
          showLabels
          value={activeTab}
          onChange={handleTabChange}
          sx={{
            height: 64,
            bgcolor: 'transparent',
            '& .MuiBottomNavigationAction-root': {
              minWidth: 0,
              padding: '6px 0',
              color: 'text.secondary',
              '&.Mui-selected': {
                color: 'primary.main',
                '& .MuiTypography-root': {
                  fontWeight: 700
                }
              }
            }
          }}
        >
          {tabs.map(tab => (
            <BottomNavigationAction key={tab.path} value={tab.path} label={tab.label} icon={tab.icon} />
          ))}
          <BottomNavigationAction value="more" label="More" icon={<MoreIcon />} />
        </BottomNavigation>
      </Paper>

      <MoreDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onOpen={() => setDrawerOpen(true)}
      />
    </Box>
  );
};
