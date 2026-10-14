import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  Grid,
  Stack,
  Button,
  Chip,
  alpha,
} from '@mui/material';
import {
  ContentCut as Scissors,
  LocalShipping as Truck,
  Add as Plus,
  WarningAmber as WarningAmberIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../../features/dashboard/analytics.api';
import { keys } from '../../query/keys';

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ElementType;
  accentColor: string;
}

function StatCard({ label, value, icon: Icon, accentColor }: StatCardProps) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) { setDisplayValue(value); return; }

    const duration = 700;
    const increment = value / (duration / 16);
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) { setDisplayValue(value); clearInterval(timer); }
      else setDisplayValue(Math.floor(current));
    }, 16);
    return () => clearInterval(timer);
  }, [value]);

  return (
    <Card
      elevation={0}
      sx={{
        flex: 1,
        p: 3,
        backgroundImage: 'none',
        bgcolor: 'var(--sf-parchment)',
        border: '1px solid',
        borderColor: 'divider',
        borderLeft: '3px solid',
        borderLeftColor: accentColor,
        borderRadius: '12px',
        textAlign: 'center',
      }}
    >
      <Box sx={{ color: accentColor, mb: 1.5, display: 'flex', justifyContent: 'center', opacity: 0.7 }}>
        <Icon sx={{ fontSize: 22 }} />
      </Box>
      <Typography variant="h3" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
        {displayValue}
      </Typography>
      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, letterSpacing: 0.6, textTransform: 'uppercase' }}>
        {label}
      </Typography>
    </Card>
  );
}

export const TailorDashboard: React.FC = () => {
  const navigate = useNavigate();

  const { data: analytics } = useQuery({
    queryKey: keys.analytics.overview,
    queryFn: analyticsApi.getOverview,
  });

  const inProgressCount = analytics?.totalActiveOrders ?? 0;
  const atRiskCount     = analytics?.highRiskGarments ?? 0;
  const recentOrders    = analytics?.recentOrders ?? [];
  const hasUrgent       = atRiskCount > 0;

  const urgentOrders = recentOrders.filter(o => o.riskLevel === 'OVERDUE');

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', pb: 8 }}>
      <Typography variant="h4" sx={{ color: 'text.primary', fontWeight: 700, mb: 4 }}>
        Your work today
      </Typography>

      <Stack spacing={3} sx={{ mb: 4 }}>

        {/* Urgent action card */}
        {hasUrgent && (
          <Card
            elevation={0}
            sx={{
              p: 2.5,
              backgroundImage: 'none',
              bgcolor: alpha('#ef4444', 0.03),
              border: '1px solid',
              borderColor: alpha('#ef4444', 0.2),
              borderLeft: '3px solid #ef4444',
              borderRadius: '16px',
            }}
          >
            <Stack direction="row" spacing={2} alignItems="flex-start">
              <Box sx={{ pt: 0.25, flexShrink: 0 }}>
                <WarningAmberIcon sx={{ fontSize: 20, color: '#ef4444' }} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.75 }}>
                  <Chip
                    label="Overdue"
                    sx={{ bgcolor: '#ef4444', color: 'white', height: 20, fontSize: '10px', fontWeight: 700, borderRadius: '4px' }}
                  />
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                    {atRiskCount} garment{atRiskCount !== 1 ? 's' : ''} need attention
                  </Typography>
                </Stack>
                <Typography variant="subtitle2" sx={{ color: 'text.primary', fontWeight: 700, mb: 0.5 }}>
                  Deadlines require action
                </Typography>
                {urgentOrders.length > 0 && (
                  <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                    {urgentOrders.slice(0, 2).map(o => o.customerName).join(' and ')}
                    {urgentOrders.length > 2 ? ` and ${urgentOrders.length - 2} more` : ''}.
                  </Typography>
                )}
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => navigate('/orders?filter=urgent')}
                  sx={{ bgcolor: '#ef4444', borderRadius: '8px', textTransform: 'none', fontWeight: 600, '&:hover': { bgcolor: '#dc2626' } }}
                >
                  View overdue orders
                </Button>
              </Box>
            </Stack>
          </Card>
        )}
      </Stack>

      {/* Quick stats row */}
      <Grid container spacing={2}>
        <Grid size={6}>
          <StatCard label="In progress" value={inProgressCount} icon={Scissors} accentColor="var(--sf-green)" />
        </Grid>
        <Grid size={6}>
          <StatCard label="At risk" value={atRiskCount} icon={Truck} accentColor="#ef4444" />
        </Grid>
      </Grid>

      {/* New order button */}
      <Button
        onClick={() => navigate('/orders/new')}
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          width: 56,
          height: 56,
          borderRadius: '50%',
          bgcolor: 'var(--sf-green)',
          color: 'white',
          minWidth: 0,
          p: 0,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          '&:hover': { bgcolor: 'var(--sf-green-dark)' },
        }}
      >
        <Plus sx={{ fontSize: 28 }} />
      </Button>
    </Box>
  );
};
