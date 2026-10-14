import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Card,
  Chip,
  LinearProgress,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Button,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
  Stack,
  alpha,
  keyframes,
} from '@mui/material';
import {
  Assignment as ClipboardList,
  Warning as AlertTriangle,
  Speed as Gauge,
  Add as Plus,
  PersonAdd as UserPlus,
  ManageAccounts as UserCog,
  Check,
  ContentCut as Scissors,
  History,
  WarningAmber as WarningAmberIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { safeFormatDistanceToNow } from '../../utils/format';
import type { ActivityItem } from '../../features/dashboard/analytics.api';
import { useAdminAnalytics } from '../../features/dashboard/useAdminAnalytics';
import { useOrders } from '../../features/orders/hooks/useOrders';
import { useInventory } from '../../features/inventory/useInventory';
import { OrderEntryItem } from '../../features/orders/components/OrderEntryItem';
import { StitchScoreCard } from '../../features/dashboard/components/StitchScoreCard';
import { TransparencyStatus } from '../../features/transparency/components/TransparencyStatus';
import { CapacityVisualizer } from '../../features/transparency/components/CapacityVisualizer';
import { QueryLoading, QueryError, QueryEmpty } from '../../components/feedback/QueryState';

const livePulse = keyframes`
  0%   { box-shadow: 0 0 0 0   rgba(30, 92, 58, 0.25); }
  70%  { box-shadow: 0 0 0 8px rgba(30, 92, 58, 0); }
  100% { box-shadow: 0 0 0 0   rgba(30, 92, 58, 0); }
`;

const getActivityIcon = (iconType?: string) => {
  switch (iconType) {
    case 'STAGE':    return Scissors;
    case 'MATERIAL': return ClipboardList;
    case 'ORDER':    return Plus;
    case 'CHECK':    return Check;
    default:         return History;
  }
};

interface KPICardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  accentColor: string;
}

function KPICard({ label, value, icon: Icon, accentColor }: KPICardProps) {
  return (
    <Card
      elevation={0}
      sx={{
        height: '100%',
        backgroundImage: 'none',
        bgcolor: 'var(--sf-parchment)',
        border: '1px solid',
        borderColor: 'divider',
        borderLeft: '3px solid',
        borderLeftColor: accentColor,
        borderRadius: '12px',
        p: 2.5,
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        transition: 'box-shadow 0.2s ease',
        '&:hover': { boxShadow: '0 4px 16px rgba(0,0,0,0.06)' },
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography
          variant="overline"
          sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: 0.8, fontSize: '0.65rem' }}
        >
          {label}
        </Typography>
        <Box sx={{ color: accentColor, opacity: 0.6, '& svg': { fontSize: 18 } }}>
          <Icon />
        </Box>
      </Stack>
      <Typography variant="h3" sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1, mt: 0.5 }}>
        {value}
      </Typography>
    </Card>
  );
}

const LOAD_LABEL: Record<string, string> = {
  RED: 'Overloaded',
  AMBER: 'Heavy load',
  GREEN: 'Optimal',
};

const LOAD_COLOR: Record<string, string> = {
  RED:   '#ef4444',
  AMBER: '#c49a1a',
  GREEN: '#1e5c3a',
};

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();

  const { data: analytics, isLoading, isError, refetch } = useAdminAnalytics();
  const { data: ordersData } = useOrders(1, 5);
  const { data: rawInventory, dataUpdatedAt: inventoryUpdatedAt } = useInventory();

  if (isLoading) {
    return (
      <Box sx={{ p: 4 }}>
        <QueryLoading label="Loading workshop data…" />
      </Box>
    );
  }

  if (isError) {
    return (
      <Box sx={{ p: 4 }}>
        <QueryError
          message="Couldn't load workshop data. Check your connection and try again."
          onRetry={() => refetch()}
        />
      </Box>
    );
  }

  const stats = {
    activeOrders:    analytics?.totalActiveOrders ?? 0,
    highRisk:        analytics?.highRiskGarments ?? 0,
    completedOrders: analytics?.completedOrders ?? 0,
    avgTime:         analytics?.avgCompletionTimeHours ? `${analytics.avgCompletionTimeHours}h` : '--',
  };

  const activity: ActivityItem[] = analytics?.activityFeed ?? [];
  const recentOrders = ordersData?.items ?? [];

  // Stock as a share of everything received; real values only
  const stocks = (rawInventory ?? []).map(item => {
    const pct = item.totalLedger > 0
      ? Math.round((item.quantityAvailable / item.totalLedger) * 100)
      : 0;
    let barColor = 'var(--sf-green)';
    if (pct <= 30) barColor = '#ef4444';
    else if (pct <= 70) barColor = '#c49a1a';
    return { materialId: item.materialId, name: item.name, level: pct, barColor };
  });

  // Tasks per stage, scaled to the busiest stage
  const tasksByStage = analytics?.tasksByStage ?? {};
  const stageNames = Object.keys(tasksByStage);
  const maxStageCount = Math.max(...Object.values(tasksByStage), 1);

  // At-risk orders from the recent orders feed
  const atRiskOrders = (analytics?.recentOrders ?? []).filter(
    o => o.riskLevel === 'AT_RISK' || o.riskLevel === 'OVERDUE'
  );

  return (
    <Box sx={{ pb: 10, position: 'relative' }}>

      <Box sx={{ mb: 5 }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          spacing={2}
        >
          <Box>
            <Typography
              variant="h4"
              sx={{ fontWeight: 800, color: 'text.primary', letterSpacing: '-0.03em', mb: 0.5 }}
            >
              Workshop overview
            </Typography>
            <Stack direction="row" spacing={2} alignItems="center">
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {format(new Date(), 'EEEE, d MMMM yyyy')}
              </Typography>
              <TransparencyStatus />
            </Stack>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
                px: 1.5,
                py: 0.5,
                borderRadius: '8px',
                bgcolor: alpha('#1e5c3a', 0.06),
                border: '1px solid',
                borderColor: alpha('#1e5c3a', 0.15),
              }}
            >
              <Box
                sx={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  bgcolor: 'var(--sf-green)',
                  animation: `${livePulse} 2s infinite`,
                  '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
                }}
              />
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'var(--sf-green)', fontSize: '11px' }}>
                Live
              </Typography>
            </Box>
          </Stack>
        </Stack>
      </Box>

      {/* At-risk orders */}
      {atRiskOrders.length > 0 && (
        <Box
          sx={{
            mb: 4,
            px: 2.5,
            py: 1.75,
            borderRadius: '10px',
            bgcolor: alpha('#c49a1a', 0.06),
            border: '1px solid',
            borderColor: alpha('#c49a1a', 0.25),
            display: 'flex',
            alignItems: 'flex-start',
            gap: 1.5,
          }}
        >
          <WarningAmberIcon sx={{ fontSize: 18, color: '#8b6914', mt: 0.15, flexShrink: 0 }} />
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 700, color: '#8b6914', display: 'block', mb: 0.25 }}>
              {stats.highRisk} garment{stats.highRisk !== 1 ? 's' : ''} need attention
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {atRiskOrders.slice(0, 4).map(o => `${o.garmentName} (${o.customerName})`).join(' · ')}
              {atRiskOrders.length > 4 && ` · +${atRiskOrders.length - 4} more`}
            </Typography>
          </Box>
        </Box>
      )}

      {/* Key figures */}
      <Grid container spacing={2.5} sx={{ mb: 5 }}>
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <Card
            elevation={0}
            sx={{
              height: '100%',
              backgroundImage: 'none',
              bgcolor: 'var(--sf-parchment)',
              border: '1px solid',
              borderColor: 'divider',
              borderLeft: '3px solid var(--sf-green)',
              borderRadius: '12px',
              p: 2.5,
            }}
          >
            <CapacityVisualizer />
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <KPICard label="Active orders" value={stats.activeOrders} icon={ClipboardList} accentColor="var(--sf-green)" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <KPICard label="At risk" value={stats.highRisk} icon={AlertTriangle} accentColor="#ef4444" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <KPICard label="Completed" value={stats.completedOrders} icon={Check} accentColor="var(--sf-gold)" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <KPICard label="Avg completion" value={stats.avgTime} icon={Gauge} accentColor="var(--sf-navy)" />
        </Grid>
      </Grid>

      {/* Load per store */}
      {(analytics?.storeDistribution ?? []).length > 0 && (
        <Box sx={{ mb: 5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.secondary', mb: 2, textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: 0.8 }}>
            Store capacity
          </Typography>
          <Grid container spacing={2.5}>
            {(analytics?.storeDistribution ?? []).map((store) => {
              const statusColor = LOAD_COLOR[store.uiHint] ?? LOAD_COLOR['GREEN'];
              return (
                <Grid key={store.storeId} size={{ xs: 12, sm: 6, md: 4 }}>
                  <Card
                    elevation={0}
                    sx={{
                      p: 2.5,
                      backgroundImage: 'none',
                      bgcolor: 'background.paper',
                      borderRadius: '12px',
                      border: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                        {store.storeName}
                      </Typography>
                      <Chip
                        label={LOAD_LABEL[store.uiHint] ?? 'Optimal'}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          bgcolor: alpha(statusColor as string, 0.1),
                          color: statusColor,
                          borderRadius: '5px',
                        }}
                      />
                    </Stack>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-end" sx={{ mb: 1.5 }}>
                      <Box>
                        <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1 }}>
                          {store.activeOrderCount}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>active orders</Typography>
                      </Box>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: statusColor }}>
                        {store.capacityUtilization}%
                      </Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(store.capacityUtilization, 100)}
                      sx={{
                        height: 4,
                        borderRadius: 2,
                        bgcolor: 'rgba(0,0,0,0.04)',
                        '& .MuiLinearProgress-bar': { bgcolor: statusColor, borderRadius: 2 },
                      }}
                    />
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </Box>
      )}

      <Grid container spacing={4}>

        {/* Left column */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Stack spacing={4}>

            <StitchScoreCard />

            {/* Work distribution */}
            {stageNames.length > 0 && (
              <Card
                elevation={0}
                sx={{
                  p: 3.5,
                  backgroundImage: 'none',
                  bgcolor: 'background.paper',
                  borderRadius: '16px',
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
                  Work distribution
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
                  Active garments by production stage
                </Typography>
                <Stack spacing={2.5}>
                  {stageNames.map(name => {
                    const count = tasksByStage[name];
                    return (
                      <Box key={name}>
                        <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.75 }}>
                          <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                            {name}
                          </Typography>
                          <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.primary' }}>
                            {count}
                          </Typography>
                        </Stack>
                        <Box sx={{ width: '100%', height: 8, bgcolor: 'rgba(0,0,0,0.04)', borderRadius: '4px', overflow: 'hidden' }}>
                          <Box
                            sx={{
                              width: `${(count / maxStageCount) * 100}%`,
                              height: '100%',
                              bgcolor: 'var(--sf-green)',
                              borderRadius: '4px',
                              transition: 'width 0.6s ease-out',
                              '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
                            }}
                          />
                        </Box>
                      </Box>
                    );
                  })}
                </Stack>
              </Card>
            )}

            {/* Recent orders */}
            <Box>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary' }}>
                  Recent orders
                </Typography>
                <Button
                  onClick={() => navigate('/orders')}
                  sx={{ color: 'var(--sf-green)', fontWeight: 700, fontSize: '12px', textTransform: 'none' }}
                >
                  View all
                </Button>
              </Stack>
              <Card
                elevation={0}
                sx={{
                  backgroundImage: 'none',
                  bgcolor: 'background.paper',
                  borderRadius: '16px',
                  border: '1px solid',
                  borderColor: 'divider',
                  overflow: 'hidden',
                }}
              >
                {recentOrders.length === 0 ? (
                  <Box sx={{ p: 3 }}>
                    <QueryEmpty
                      message="No orders yet."
                      hint="New orders will appear here once created."
                      action={
                        <Button
                          size="small"
                          onClick={() => navigate('/orders/new')}
                          sx={{ textTransform: 'none', fontWeight: 600, color: 'var(--sf-green)' }}
                        >
                          Create first order
                        </Button>
                      }
                    />
                  </Box>
                ) : (
                  <Stack spacing={0}>
                    {recentOrders.map((order: any, index: number) => (
                      <OrderEntryItem
                        key={`${order.id}-${index}`}
                        order={order}
                        onClick={() => navigate(`/orders/${order.id}`)}
                      />
                    ))}
                  </Stack>
                )}
              </Card>
            </Box>

          </Stack>
        </Grid>

        {/* Right column */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Stack spacing={3}>

            {/* Team activity */}
            <Card
              elevation={0}
              sx={{
                p: 3,
                backgroundImage: 'none',
                bgcolor: 'background.paper',
                borderRadius: '16px',
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary', mb: 2.5 }}>
                Team activity
              </Typography>
              {activity.length === 0 ? (
                <QueryEmpty message="No recent activity." size="sm" />
              ) : (
                <List disablePadding>
                  {activity.map((item, index) => {
                    const ActivityIcon = getActivityIcon(item.iconType);
                    return (
                      <ListItem key={index} disablePadding sx={{ mb: 2.5, position: 'relative' }}>
                        <ListItemAvatar sx={{ minWidth: 48 }}>
                          <Avatar
                            sx={{
                              width: 34,
                              height: 34,
                              bgcolor: 'var(--sf-parchment)',
                              color: item.color ?? 'var(--sf-green)',
                              border: '1px solid',
                              borderColor: alpha(item.color ?? '#1e5c3a', 0.15),
                            }}
                          >
                            <ActivityIcon sx={{ fontSize: 16 }} />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', lineHeight: 1.4 }}>
                              {item.text}{' '}
                              <Box component="span" sx={{ fontWeight: 400, color: 'text.secondary' }}>
                                {item.detail}
                              </Box>
                            </Typography>
                          }
                          secondary={item.time ? safeFormatDistanceToNow(item.time) : 'Just now'}
                          secondaryTypographyProps={{ fontSize: '11px', color: 'text.disabled', fontWeight: 500, mt: 0.25 }}
                        />
                      </ListItem>
                    );
                  })}
                </List>
              )}
              <Button
                variant="text"
                fullWidth
                onClick={() => navigate('/reports/audit')}
                sx={{
                  mt: 0.5,
                  color: 'text.secondary',
                  borderRadius: '8px',
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '12px',
                  '&:hover': { bgcolor: 'rgba(0,0,0,0.03)', color: 'var(--sf-green)' },
                }}
              >
                View audit log
              </Button>
            </Card>

            {/* Material stock */}
            {stocks.length > 0 && (
              <Card
                elevation={0}
                sx={{
                  p: 3,
                  backgroundImage: 'none',
                  background: 'linear-gradient(150deg, var(--sf-green) 0%, #163d28 100%)',
                  color: 'white',
                  position: 'relative',
                  overflow: 'hidden',
                  borderRadius: '16px',
                }}
              >
                <Typography
                  variant="overline"
                  sx={{ fontWeight: 700, color: alpha('#fff', 0.55), letterSpacing: 1.2, mb: 2.5, display: 'block', fontSize: '0.65rem' }}
                >
                  Material stock
                </Typography>
                <Stack spacing={2} sx={{ mb: 2.5 }}>
                  {stocks.map(stock => (
                    <Box key={stock.materialId}>
                      <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.6 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '13px' }}>{stock.name}</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '13px' }}>{stock.level}%</Typography>
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={stock.level}
                        sx={{
                          height: 5,
                          borderRadius: 3,
                          bgcolor: 'rgba(255,255,255,0.12)',
                          '& .MuiLinearProgress-bar': { bgcolor: stock.barColor, borderRadius: 3 },
                        }}
                      />
                    </Box>
                  ))}
                </Stack>
                <Typography variant="caption" sx={{ color: alpha('#fff', 0.35), fontSize: '10px' }}>
                  {inventoryUpdatedAt
                    ? `Synced at ${new Date(inventoryUpdatedAt).toLocaleTimeString()}`
                    : 'Syncing inventory…'}
                </Typography>
                <Box sx={{ position: 'absolute', bottom: -8, right: -8, opacity: 0.04 }}>
                  <Scissors sx={{ fontSize: 72 }} />
                </Box>
              </Card>
            )}

          </Stack>
        </Grid>
      </Grid>

      {/* Quick actions button */}
      <SpeedDial
        ariaLabel="Quick actions"
        sx={{ position: 'fixed', bottom: { xs: 88, md: 24 }, right: 24, zIndex: 1200 }}
        icon={<SpeedDialIcon icon={<Plus />} />}
        FabProps={{ sx: { bgcolor: 'var(--sf-green)', '&:hover': { bgcolor: 'var(--sf-green-dark)' } } }}
      >
        <SpeedDialAction
          icon={<ClipboardList sx={{ fontSize: 20 }} />}
          tooltipTitle="New order"
          onClick={() => navigate('/orders/new')}
        />
        <SpeedDialAction
          icon={<UserPlus sx={{ fontSize: 20 }} />}
          tooltipTitle="Customers"
          onClick={() => navigate('/customers')}
        />
        <SpeedDialAction
          icon={<UserCog sx={{ fontSize: 20 }} />}
          tooltipTitle="Add staff"
          onClick={() => navigate('/staff/new')}
        />
      </SpeedDial>
    </Box>
  );
};
