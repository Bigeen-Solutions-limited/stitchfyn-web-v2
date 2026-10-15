import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Box,
  Avatar,
  Chip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  Menu as MenuIcon,
  CalendarMonth as Calendar,
  Logout as LogOut,
  LockReset,
} from '@mui/icons-material';
import { useAuthStore } from '../../features/auth/auth.store';
import { useLogout } from '../../features/auth/hooks/useAuth';
import { Breadcrumbs } from '../navigation/Breadcrumbs';
import { usePageTitle } from '../navigation/pageTitles';
import { NotificationBell } from '../../features/notifications/components/NotificationBell';

interface TopBarProps {
  toggleSidebar: () => void;
  isSidebarOpen: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({ toggleSidebar, isSidebarOpen }) => {
  const { user } = useAuthStore();
  const logout = useLogout();
  const navigate = useNavigate();
  const pageTitle = usePageTitle();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleProfileClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileClose = () => {
    setAnchorEl(null);
  };

  const handleChangePassword = () => {
    handleProfileClose();
    navigate('/change-password');
  };

  const handleLogout = () => {
    handleProfileClose();
    logout.mutate();
  };

  const isAdmin = user?.role === 'OWNER';

  // Sits in the main column's flow, which already starts beside the sidebar
  return (
    <AppBar
      position="sticky"
      elevation={0}
      className="top-bar"
      sx={{ zIndex: (theme) => theme.zIndex.appBar }}
    >
      <Toolbar className="top-bar-toolbar">
        {!isSidebarOpen && (
          <IconButton
            onClick={toggleSidebar}
            edge="start"
            aria-label="Open navigation"
            sx={{ mr: 2, color: 'var(--color-text-primary)' }}
          >
            <MenuIcon sx={{ fontSize: 24 }} />
          </IconButton>
        )}

        <Box sx={{ flexGrow: 1, minWidth: 0, py: 1 }}>
          <Breadcrumbs />
          <Typography variant="h6" noWrap sx={{ fontWeight: 800, letterSpacing: '-0.5px', color: 'var(--color-text-primary)' }}>
            {pageTitle}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, md: 2 } }}>
          {isAdmin && (
            <Chip
              icon={<Calendar sx={{ fontSize: 16, color: 'var(--color-warning) !important' }} />}
              label={new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric'
              })}
              variant="outlined"
              sx={{
                display: { xs: 'none', lg: 'flex' },
                borderColor: 'var(--color-warning)',
                color: 'var(--color-text-primary)',
                fontWeight: 600,
                height: 36,
                borderRadius: '8px',
              }}
            />
          )}

          <NotificationBell />

          <IconButton onClick={handleProfileClick} aria-label="Account menu" sx={{ p: 0.5 }}>
            <Avatar
              src={user?.avatarUrl}
              sx={{ width: 36, height: 36, bgcolor: 'var(--color-primary)' }}
            >
              {user?.fullName?.charAt(0)}
            </Avatar>
          </IconButton>
        </Box>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleProfileClose}
          PaperProps={{
            elevation: 0,
            sx: {
              mt: 1.5,
              minWidth: 180,
              filter: 'drop-shadow(0px 8px 16px rgba(0,0,0,0.1))',
              border: '1px solid #e5e4e0',
              borderRadius: '12px',
            },
          }}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          <MenuItem onClick={handleChangePassword}>
            <ListItemIcon>
              <LockReset sx={{ fontSize: 18 }} />
            </ListItemIcon>
            <ListItemText primary="Change password" />
          </MenuItem>
          <Divider sx={{ my: 1 }} />
          <MenuItem onClick={handleLogout} sx={{ color: '#d32f2f' }}>
            <ListItemIcon>
              <LogOut sx={{ fontSize: 18, color: '#d32f2f' }} />
            </ListItemIcon>
            <ListItemText primary="Logout" />
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
};
