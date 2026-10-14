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

export const BottomNav: React.FC = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [drawerOpen, setDrawerOpen] = useState(false);

  if (!isMobile) return null;

  const getActiveTab = () => {
    if (pathname.startsWith('/orders')) return 1;
    if (pathname.startsWith('/production')) return 2;
    if (pathname.startsWith('/customers')) return 3;
    if (pathname === '/dashboard') return 0;
    return -1; // other pages highlight "More" through the drawer
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    if (newValue === 4) {
      setDrawerOpen(true);
      return;
    }

    const paths = ['/dashboard', '/orders', '/production', '/customers'];
    navigate(paths[newValue]);
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
          value={getActiveTab()}
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
          <BottomNavigationAction label="Dashboard" icon={<DashboardIcon />} />
          <BottomNavigationAction label="Orders" icon={<OrdersIcon />} />
          <BottomNavigationAction label="Production" icon={<ProductionIcon />} />
          <BottomNavigationAction label="Clients" icon={<CustomersIcon />} />
          <BottomNavigationAction label="More" icon={<MoreIcon />} />
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
