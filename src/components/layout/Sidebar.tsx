import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Stack,
  Avatar,
  useMediaQuery,
  alpha,
  Select,
  MenuItem,
  CircularProgress,
} from '@mui/material';
import {
  Menu as MenuIcon,
  ContentCut as ScissorsIcon,
  Dashboard as LayoutDashboard,
  Assignment as ClipboardList,
  People as Users,
  Payment as CreditCard,
  ManageAccounts as UserCog,
  BarChart as BarChart2,
  Settings,
  Add as Plus,
  Gavel as GavelIcon,
  AccountTree as WorkflowIcon,
  Groups as GroupsIcon,
  Store as StoreIcon,
  Security as SecurityShieldIcon,
  Article as ArticleIcon,
  Grade as GradeIcon,
} from '@mui/icons-material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../features/auth/auth.store';
import { getTenantsApi, switchTenantApi } from '../../features/auth/auth.api';
import { BRAND_NAME } from '../../config/brand';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  toggleSidebar: () => void;
}

const SIDEBAR_WIDTH = 'var(--sidebar-width)';
const ALL_STORES = '__all__';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', roles: ['OWNER', 'MANAGER', 'TAILOR', 'FRONT_DESK', 'CUSTOMER'] },
  // Roles match the route guards (order and client pages need MANAGE_ORDERS); tailors get their own orders instead
  { label: 'Orders', icon: ClipboardList, path: '/orders', roles: ['OWNER', 'MANAGER', 'FRONT_DESK'] },
  { label: 'My Orders', icon: ClipboardList, path: '/my-work', roles: ['TAILOR'] },
  { label: 'New Order', icon: Plus, path: '/orders/new', roles: ['OWNER', 'MANAGER', 'FRONT_DESK'] },
  { label: 'Production', icon: ScissorsIcon, path: '/production', roles: ['OWNER', 'MANAGER', 'TAILOR'] },
  { label: 'Customers', icon: Users, path: '/customers', roles: ['OWNER', 'MANAGER', 'FRONT_DESK'] },
  { label: 'Inventory', icon: ClipboardList, path: '/inventory', roles: ['OWNER', 'MANAGER'] },
  { label: 'Disputes', icon: GavelIcon, path: '/disputes', roles: ['OWNER', 'MANAGER'] },
  { label: 'Group Orders', icon: GroupsIcon, path: '/group-orders', roles: ['OWNER', 'MANAGER'] },
  { label: 'Payments', icon: CreditCard, path: '/payments', roles: ['OWNER', 'MANAGER'], isBeta: true },
  { label: 'Workflow Templates', icon: WorkflowIcon, path: '/workflow-templates', roles: ['OWNER'] },
  { label: 'Staff Management', icon: UserCog, path: '/staff', roles: ['OWNER'] },
  { label: 'Reports', icon: BarChart2, path: '/reports', roles: ['OWNER', 'MANAGER'] },
  { label: 'StitchScore', icon: GradeIcon, path: '/stitch-score', roles: ['OWNER'] },
];

const forensicNavItems = [
  { label: 'Audit Log', icon: ArticleIcon, path: '/reports/audit' },
  { label: 'Security Audit', icon: SecurityShieldIcon, path: '/reports/security-audit' },
];

export const Sidebar: React.FC<SidebarProps> = ({ open, onClose, toggleSidebar }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width:768px)');
  const { user, setAuth } = useAuthStore();
  const queryClient = useQueryClient();
  const [isSwitching, setIsSwitching] = useState(false);

  const { data: tenants = [] } = useQuery({
    queryKey: ['auth', 'tenants'],
    queryFn: getTenantsApi,
    enabled: user?.role === 'OWNER', // only owners work across stores
    staleTime: 5 * 60 * 1000,
  });

  // The server scopes every list to the store in the new token, so drop what was loaded for the old one
  const handleSwitchTenant = async (value: string) => {
    const storeId = value === ALL_STORES ? null : value;
    if (storeId === (user?.storeId ?? null)) return;
    setIsSwitching(true);
    try {
      const result = await switchTenantApi(storeId);
      setAuth(result.accessToken, result.user);
      await queryClient.resetQueries();
      navigate('/dashboard');
    } finally {
      setIsSwitching(false);
    }
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    if (isMobile) onClose();
  };

  const filteredNavItems = navItems.filter(item =>
    !item.roles || (user?.role && item.roles.includes(user.role))
  );

  const drawerContent = (
    <Box className="sidebar-container">
      <Box className="sidebar-header">
        <IconButton onClick={toggleSidebar} sx={{ color: 'white' }}>
          <MenuIcon sx={{ fontSize: 24 }} />
        </IconButton>
        {/* Gold seal with a white wordmark, made for this dark header */}
        <Box component="img" src="/logo-full.png" alt={BRAND_NAME} sx={{ height: 30, width: 'auto', maxWidth: '100%', display: 'block' }} />
      </Box>

      <List sx={{ px: 0 }}>
        {filteredNavItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <ListItem key={item.label} disablePadding>
              <ListItemButton
                onClick={() => handleNavigation(item.path)}
                sx={{
                  py: 1.2,
                  px: 2,
                  bgcolor: isActive ? alpha('#1e5c3a', 0.15) : 'transparent',
                  borderLeft: isActive ? '3px solid var(--color-primary)' : '3px solid transparent',
                  '&:hover': {
                    bgcolor: alpha('#ffffff', 0.07),
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40, color: isActive ? 'white' : alpha('#ffffff', 0.6) }}>
                  <item.icon sx={{ fontSize: 20 }} />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Typography sx={{
                        fontSize: '13px',
                        fontWeight: isActive ? 600 : 400,
                        color: isActive ? 'white' : alpha('#ffffff', 0.6),
                      }}>
                        {item.label}
                      </Typography>
                      {(item as any).isBeta && (
                        <Box sx={{
                          px: 0.6,
                          py: 0.1,
                          borderRadius: '4px',
                          bgcolor: alpha('#c49a1a', 0.15),
                          color: 'var(--color-warning)',
                          fontSize: '8px',
                          fontWeight: 900,
                          lineHeight: 1,
                          letterSpacing: 0.5
                        }}>
                          BETA
                        </Box>
                      )}
                    </Stack>
                  }
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      {/* Owners only */}
      {user?.role === 'OWNER' && (
        <Box>
          <Box sx={{ px: 2, pt: 2, pb: 0.5 }}>
            <Typography sx={{
              fontSize: '9px',
              fontWeight: 900,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: alpha('#ffffff', 0.3),
            }}>
              Forensic Center
            </Typography>
          </Box>
          <List sx={{ px: 0, pb: 0 }}>
            {forensicNavItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <ListItem key={item.label} disablePadding>
                  <ListItemButton
                    onClick={() => handleNavigation(item.path)}
                    sx={{
                      py: 1.2,
                      px: 2,
                      bgcolor: isActive ? alpha('#1e5c3a', 0.15) : 'transparent',
                      borderLeft: isActive ? '3px solid var(--color-primary)' : '3px solid transparent',
                      '&:hover': { bgcolor: alpha('#ffffff', 0.07) },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 40, color: isActive ? 'white' : alpha('#ffffff', 0.6) }}>
                      <item.icon sx={{ fontSize: 20 }} />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography sx={{
                          fontSize: '13px',
                          fontWeight: isActive ? 600 : 400,
                          color: isActive ? 'white' : alpha('#ffffff', 0.6),
                        }}>
                          {item.label}
                        </Typography>
                      }
                    />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        </Box>
      )}

      {/* Bottom Actions */}
      <Box sx={{ mt: 'auto' }}>
        {(user?.role === 'OWNER' || user?.role === 'MANAGER') && (
          <List sx={{ px: 0, pb: 1 }}>
            <ListItem disablePadding>
              <ListItemButton
                onClick={() => handleNavigation('/settings')}
                sx={{
                  py: 1.2,
                  px: 2,
                  bgcolor: location.pathname === '/settings' ? alpha('#ffffff', 0.1) : 'transparent',
                  borderLeft: location.pathname === '/settings' ? '3px solid var(--color-primary)' : '3px solid transparent',
                  '&:hover': { bgcolor: alpha('#ffffff', 0.07) },
                }}
              >
                <ListItemIcon sx={{
                  minWidth: 40,
                  color: location.pathname === '/settings' ? 'white' : alpha('#ffffff', 0.6)
                }}>
                  <Settings sx={{ fontSize: 20 }} />
                </ListItemIcon>
                <ListItemText
                  primary="Settings"
                  primaryTypographyProps={{
                    fontSize: '13px',
                    fontWeight: location.pathname === '/settings' ? 600 : 400,
                    color: location.pathname === '/settings' ? 'white' : alpha('#ffffff', 0.6)
                  }}
                />
              </ListItemButton>
            </ListItem>
          </List>
        )}

        {/* Only for users with more than one store */}
        {tenants.length > 1 && (
          <Box sx={{ px: 2, pb: 1 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
              <StoreIcon sx={{ fontSize: 12, color: alpha('#ffffff', 0.4) }} />
              <Typography variant="caption" sx={{ color: alpha('#ffffff', 0.4), fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' }}>
                Active Store
              </Typography>
              {isSwitching && <CircularProgress size={10} sx={{ color: 'white' }} />}
            </Stack>
            <Select
              value={user?.storeId ?? ALL_STORES}
              onChange={(e) => handleSwitchTenant(e.target.value as string)}
              size="small"
              fullWidth
              disabled={isSwitching}
              sx={{
                color: 'white',
                fontSize: '12px',
                fontWeight: 600,
                '.MuiOutlinedInput-notchedOutline': { borderColor: alpha('#ffffff', 0.2) },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: alpha('#ffffff', 0.4) },
                '.MuiSvgIcon-root': { color: alpha('#ffffff', 0.5) },
                bgcolor: alpha('#ffffff', 0.05),
                borderRadius: '8px',
              }}
            >
              <MenuItem value={ALL_STORES} sx={{ fontSize: '12px' }}>All stores</MenuItem>
              {tenants.map((t, idx) => (
                <MenuItem key={`${t.storeId}-${idx}`} value={t.storeId} sx={{ fontSize: '12px' }}>
                  {t.storeName}
                </MenuItem>
              ))}
            </Select>
          </Box>
        )}

        {/* User Card */}
        <Box className="sidebar-user-card">
          <Avatar
            src={user?.avatarUrl}
            sx={{ width: 40, height: 40, border: `1px solid ${alpha('#ffffff', 0.2)}` }}
          />
          <Box sx={{ overflow: 'hidden' }}>
            <Typography variant="subtitle2" noWrap sx={{ fontWeight: 600, color: '#ffffff' }}>
              {user?.fullName}
            </Typography>
            <Typography variant="caption" noWrap sx={{ display: 'block', color: alpha('#ffffff', 0.6) }}>
              {user?.role?.replace('_', ' ')}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Drawer
      variant={isMobile ? 'temporary' : 'persistent'}
      open={open}
      onClose={onClose}
      sx={{
        // A closed persistent drawer keeps its root in the flex row, so collapse that too or main stays offset
        width: isMobile || open ? SIDEBAR_WIDTH : 0,
        flexShrink: 0,
        transition: (theme) => theme.transitions.create('width', {
          easing: theme.transitions.easing.sharp,
          duration: theme.transitions.duration.leavingScreen,
        }),
        '& .MuiDrawer-paper': {
          width: SIDEBAR_WIDTH,
          boxSizing: 'border-box',
          borderRight: 'none',
          bgcolor: '#163d28',
          color: 'white',
        },
      }}
    >
      {drawerContent}
    </Drawer>
  );
};
