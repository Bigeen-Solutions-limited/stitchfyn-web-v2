import { useState } from 'react';
import {
  Box,
  Typography,
  Stack,
  Switch,
  Chip,
  CircularProgress,
  Alert,
  Tooltip,
  alpha,
  Paper,
} from '@mui/material';
import {
  Shield as ShieldIcon,
  RestartAlt as RevertIcon,
  LockOutlined as LockIcon,
  CheckCircleOutline as CheckIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rolePermissionsApi } from '../role-permissions.api';

const CAPABILITY_LABELS: Record<string, string> = {
  VIEW_ORDERS: 'View Orders',
  CREATE_ORDER: 'Create Orders',
  MANAGE_PRODUCTION: 'Manage Production',
  APPROVE_QC: 'Approve QC',
  MANAGE_CUSTOMERS: 'Manage Customers',
  MANAGE_USERS: 'Manage Users',
  VIEW_FINANCIALS: 'View Financials',
  MANAGE_SEALS: 'Manage Seals',
};

const CAPABILITY_DESCRIPTIONS: Record<string, string> = {
  VIEW_ORDERS: 'Read access to all order records',
  CREATE_ORDER: 'Create new customer orders',
  MANAGE_PRODUCTION: 'Update stage progress and production notes',
  APPROVE_QC: 'Submit and approve quality control results',
  MANAGE_CUSTOMERS: 'Create and update customer profiles',
  MANAGE_USERS: 'Invite, deactivate and manage staff',
  VIEW_FINANCIALS: 'Access financial reports and analytics',
  MANAGE_SEALS: 'Issue and verify fabric safety seals',
};

const CONFIGURABLE_ROLES = ['MANAGER', 'TAILOR', 'FRONT_DESK'];

const ROLE_LABELS: Record<string, string> = {
  OWNER: 'Owner',
  MANAGER: 'Manager',
  TAILOR: 'Tailor',
  FRONT_DESK: 'Front Desk',
  CUSTOMER: 'Customer',
  SYSTEM_ADMIN: 'System Admin',
};

export function RolePermissionsMatrix() {
  const queryClient = useQueryClient();
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['role-permissions'],
    queryFn: rolePermissionsApi.getMatrix,
  });

  const setOverrideMutation = useMutation({
    mutationFn: ({ role, capability, isEnabled }: { role: string; capability: string; isEnabled: boolean }) =>
      rolePermissionsApi.setOverride(role, capability, isEnabled),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['role-permissions'] });
      setPendingKey(null);
    },
  });

  const deleteOverrideMutation = useMutation({
    mutationFn: ({ role, capability }: { role: string; capability: string }) =>
      rolePermissionsApi.deleteOverride(role, capability),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['role-permissions'] });
      setPendingKey(null);
    },
  });

  const handleToggle = (role: string, capability: string, currentEnabled: boolean) => {
    const key = `${role}:${capability}`;
    setPendingKey(key);
    setOverrideMutation.mutate({ role, capability, isEnabled: !currentEnabled });
  };

  const handleRevert = (role: string, capability: string) => {
    const key = `${role}:${capability}`;
    setPendingKey(key);
    deleteOverrideMutation.mutate({ role, capability });
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress color="primary" />
      </Box>
    );
  }

  if (isError) {
    return (
      <Alert severity="error" sx={{ borderRadius: '12px' }}>
        Failed to load role permissions. Please try again.
      </Alert>
    );
  }

  // Owner, customer and system admin can't be configured
  const configurableRoles = data?.roles.filter(r => CONFIGURABLE_ROLES.includes(r.role)) ?? [];
  // Every role has the same capability list, so read it from the first
  const capabilities = configurableRoles[0]?.capabilities.map(c => c.capability) ?? [];

  return (
    <Box>
      <header style={{ marginBottom: 32 }}>
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
          <ShieldIcon color="primary" sx={{ fontSize: 28 }} />
          <Typography variant="h5" sx={{ fontWeight: 800 }}>Role Permissions</Typography>
        </Stack>
        <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 560 }}>
          Configure which capabilities each role can access. The Owner role always has full access
          and cannot be restricted. Overrides are stored per-company and override the system defaults.
        </Typography>
      </header>

      <Alert
        severity="info"
        icon={<LockIcon fontSize="inherit" />}
        sx={{ mb: 3, borderRadius: '12px', border: '1px solid', borderColor: 'info.light' }}
      >
        <strong>Owner</strong> has all capabilities permanently enabled and cannot be restricted.
      </Alert>

      <Paper
        variant="outlined"
        sx={{
          borderRadius: '20px',
          overflow: 'hidden',
          borderColor: 'divider',
        }}
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: `1fr repeat(${configurableRoles.length}, 1fr)`,
            bgcolor: alpha('#1e5c3a', 0.04),
            borderBottom: '1px solid',
            borderColor: 'divider',
            px: 3,
            py: 2,
          }}
        >
          <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: 1 }}>
            Capability
          </Typography>
          {configurableRoles.map(r => (
            <Box key={r.role} sx={{ textAlign: 'center' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'primary.main' }}>
                {ROLE_LABELS[r.role] ?? r.role}
              </Typography>
            </Box>
          ))}
        </Box>

        {capabilities.map((cap, idx) => (
          <Box
            key={cap}
            sx={{
              display: 'grid',
              gridTemplateColumns: `1fr repeat(${configurableRoles.length}, 1fr)`,
              px: 3,
              py: 2,
              bgcolor: idx % 2 === 0 ? 'background.paper' : alpha('#f8f7f4', 0.6),
              borderBottom: idx < capabilities.length - 1 ? '1px solid' : 'none',
              borderColor: 'divider',
              alignItems: 'center',
              '&:hover': { bgcolor: alpha('#1e5c3a', 0.02) },
              transition: 'background-color 0.15s ease',
            }}
          >
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                {CAPABILITY_LABELS[cap] ?? cap}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {CAPABILITY_DESCRIPTIONS[cap] ?? ''}
              </Typography>
            </Box>

            {configurableRoles.map(r => {
              const entry = r.capabilities.find(c => c.capability === cap);
              const isEnabled = entry?.isEnabled ?? false;
              const isOverridden = entry?.isOverridden ?? false;
              const key = `${r.role}:${cap}`;
              const isPending = pendingKey === key;

              return (
                <Box key={r.role} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                  {isPending ? (
                    <CircularProgress size={20} />
                  ) : (
                    <Switch
                      checked={isEnabled}
                      onChange={() => handleToggle(r.role, cap, isEnabled)}
                      color="primary"
                      size="small"
                      sx={{
                        '& .MuiSwitch-thumb': {
                          boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                        },
                      }}
                    />
                  )}
                  {isOverridden && (
                    <Tooltip title="Reverts to default" placement="top">
                      <Chip
                        label="Override"
                        size="small"
                        icon={<RevertIcon sx={{ fontSize: '12px !important' }} />}
                        onClick={() => handleRevert(r.role, cap)}
                        sx={{
                          height: 18,
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          bgcolor: alpha('#c9a84c', 0.12),
                          color: '#8a6d1a',
                          border: '1px solid',
                          borderColor: alpha('#c9a84c', 0.3),
                          cursor: 'pointer',
                          '& .MuiChip-icon': { color: '#8a6d1a' },
                          '&:hover': { bgcolor: alpha('#c9a84c', 0.2) },
                        }}
                      />
                    </Tooltip>
                  )}
                  {!isOverridden && (
                    <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.6rem' }}>
                      default
                    </Typography>
                  )}
                </Box>
              );
            })}
          </Box>
        ))}
      </Paper>

      <Stack direction="row" spacing={3} sx={{ mt: 3 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <CheckIcon sx={{ fontSize: 16, color: 'primary.main' }} />
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Default — from system defaults
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center">
          <RevertIcon sx={{ fontSize: 16, color: '#8a6d1a' }} />
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Override — click to revert to default
          </Typography>
        </Stack>
      </Stack>
    </Box>
  );
}
