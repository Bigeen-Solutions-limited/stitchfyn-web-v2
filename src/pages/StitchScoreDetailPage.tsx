import React from 'react';
import {
  Box,
  Typography,
  Stack,
  Card,
  Chip,
  CircularProgress,
  LinearProgress,
  Grid,
  alpha,
  Skeleton,
  Divider,
} from '@mui/material';
import {
  WorkspacePremium as WorkspacePremiumIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Handshake as HandshakeIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import { useStitchScore } from '../features/dashboard/useStitchScore';

const ScoreRing: React.FC<{ score: number }> = ({ score }) => {
  const color = score >= 80 ? '#1e5c3a' : score >= 60 ? '#d97706' : '#dc2626';
  const label = score >= 80 ? 'EXCELLENT' : score >= 60 ? 'GOOD' : 'NEEDS WORK';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <Box sx={{ position: 'relative', display: 'inline-flex' }}>
        <CircularProgress variant="determinate" value={100} size={180} thickness={3} sx={{ color: alpha(color, 0.1) }} />
        <CircularProgress
          variant="determinate"
          value={score}
          size={180}
          thickness={3}
          sx={{ color, position: 'absolute', left: 0 }}
        />
        <Box
          sx={{
            top: 0, left: 0, bottom: 0, right: 0, position: 'absolute',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
          }}
        >
          <Typography variant="h2" sx={{ fontWeight: 900, color: '#1a2340', letterSpacing: '-0.03em', lineHeight: 1 }}>
            {score}
          </Typography>
          <Typography variant="caption" sx={{ fontWeight: 800, color, textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '10px' }}>
            {label}
          </Typography>
        </Box>
      </Box>
      <Box sx={{ textAlign: 'center' }}>
        <Typography variant="h6" sx={{ fontWeight: 800, color: '#1a2340' }}>StitchScore</Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Reputation Index
        </Typography>
      </Box>
    </Box>
  );
};

interface MetricRowProps {
  icon: React.ElementType;
  label: string;
  description: string;
  value: number;
  color: string;
}

const MetricRow: React.FC<MetricRowProps> = ({ icon: Icon, label, description, value, color }) => (
  <Box
    sx={{
      p: 3,
      borderRadius: '16px',
      bgcolor: alpha(color, 0.04),
      border: `1px solid ${alpha(color, 0.1)}`,
    }}
  >
    <Stack direction="row" spacing={2} alignItems="flex-start">
      <Box
        sx={{
          p: 1.2,
          borderRadius: '12px',
          bgcolor: alpha(color, 0.1),
          color,
          flexShrink: 0,
          display: 'flex',
        }}
      >
        <Icon sx={{ fontSize: 20 }} />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#1a2340' }}>{label}</Typography>
          <Typography variant="subtitle1" sx={{ fontWeight: 900, color, ml: 1 }}>{Math.round(value)}%</Typography>
        </Stack>
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1.5 }}>
          {description}
        </Typography>
        <LinearProgress
          variant="determinate"
          value={value}
          sx={{
            height: 8,
            borderRadius: 4,
            bgcolor: alpha(color, 0.1),
            '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 4 },
          }}
        />
      </Box>
    </Stack>
  </Box>
);

const QualifyingBanner: React.FC<{ progress: number }> = ({ progress }) => (
  <Card
    sx={{
      p: { xs: 3, md: 4 },
      borderRadius: '20px',
      border: '1px solid rgba(255,255,255,0.3)',
      bgcolor: 'rgba(255,255,255,0.5)',
      backdropFilter: 'blur(10px)',
    }}
  >
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 800, color: '#1a2340', mb: 1 }}>
          StitchScore
        </Typography>
        <Typography variant="body2" sx={{ color: '#6b7280', maxWidth: 500 }}>
          Your reputation capital is building. Complete more orders to unlock your full StitchScore profile and performance breakdown.
        </Typography>
      </Box>
      <Box sx={{ bgcolor: alpha('#1e5c3a', 0.05), p: 3, borderRadius: '16px' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1e5c3a' }}>Qualifying Phase</Typography>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1e5c3a' }}>{progress} / 10 Orders</Typography>
        </Stack>
        <LinearProgress
          variant="determinate"
          value={(progress / 10) * 100}
          sx={{
            height: 10,
            borderRadius: 5,
            bgcolor: alpha('#1e5c3a', 0.1),
            '& .MuiLinearProgress-bar': { bgcolor: '#1e5c3a', borderRadius: 5 },
          }}
        />
        <Typography variant="caption" sx={{ color: 'text.secondary', mt: 1.5, display: 'block' }}>
          {10 - progress} more completed orders needed to activate your score
        </Typography>
      </Box>
    </Stack>
  </Card>
);

export const StitchScoreDetailPage: React.FC = () => {
  const { data, isLoading } = useStitchScore();

  return (
    <Box className="container" sx={{ py: 4 }}>
      <header style={{ marginBottom: 32 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <TrendingUpIcon sx={{ fontSize: 32, color: 'primary.main' }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800, fontSize: { xs: '1.25rem', md: '2.125rem' } }}>
              StitchScore Report
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
              Your workshop's reputation capital — calculated from delivery performance, dispute history, and client loyalty.
            </Typography>
          </Box>
        </Stack>
      </header>

      {isLoading ? (
        <Stack spacing={3}>
          <Skeleton variant="rectangular" height={300} sx={{ borderRadius: '24px' }} />
          <Skeleton variant="rectangular" height={120} sx={{ borderRadius: '16px' }} />
          <Skeleton variant="rectangular" height={120} sx={{ borderRadius: '16px' }} />
          <Skeleton variant="rectangular" height={120} sx={{ borderRadius: '16px' }} />
        </Stack>
      ) : !data || data.status === 'INSUFFICIENT_DATA' || data.status === 'QUALIFYING' ? (
        <QualifyingBanner progress={data?.thresholdProgress ?? 0} />
      ) : (
        <Grid container spacing={4}>
          {/* Left — Score Ring */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Card
              sx={{
                p: 4,
                borderRadius: '24px',
                border: '1px solid rgba(255,255,255,0.3)',
                bgcolor: 'rgba(255,255,255,0.5)',
                backdropFilter: 'blur(10px)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 3,
                position: 'relative',
              }}
            >
              {data.isFoundingMember && (
                <Chip
                  icon={<WorkspacePremiumIcon sx={{ fontSize: '14px !important', color: '#d97706 !important' }} />}
                  label="Founding Member"
                  size="small"
                  sx={{
                    position: 'absolute',
                    top: 16,
                    right: 16,
                    height: 24,
                    fontSize: '10px',
                    fontWeight: 800,
                    bgcolor: alpha('#d97706', 0.1),
                    color: '#d97706',
                    borderRadius: '8px',
                  }}
                />
              )}
              <ScoreRing score={data.score ?? 0} />
              <Divider sx={{ width: '100%' }} />
              <Stack spacing={1} sx={{ width: '100%' }}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Score Breakdown
                </Typography>
                {[
                  { label: 'On-Time Rate', value: (data.breakdown.onTimeRate ?? 0) * 100, color: '#1e5c3a' },
                  { label: 'Integrity Rate', value: (data.breakdown.integrityRate ?? 0) * 100, color: '#0369a1' },
                  { label: 'Loyalty Rate', value: (data.breakdown.loyaltyRate ?? 0) * 100, color: '#6d28d9' },
                ].map(({ label, value, color }) => (
                  <Stack key={label} direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>{label}</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 800, color }}>{Math.round(value)}%</Typography>
                  </Stack>
                ))}
              </Stack>
            </Card>
          </Grid>

          {/* Right — Metric Details */}
          <Grid size={{ xs: 12, md: 8 }}>
            <Stack spacing={2}>
              <MetricRow
                icon={ScheduleIcon}
                label="On-Time Delivery Rate"
                description="Percentage of orders delivered on or before the agreed deadline. This is the primary trust signal your clients assess."
                value={(data.breakdown.onTimeRate ?? 0) * 100}
                color="#1e5c3a"
              />
              <MetricRow
                icon={CheckCircleIcon}
                label="Zero-Dispute Integrity Rate"
                description="Percentage of completed orders that required no dispute or arbitration. High integrity signals consistent quality and accurate expectation-setting."
                value={(data.breakdown.integrityRate ?? 0) * 100}
                color="#0369a1"
              />
              <MetricRow
                icon={HandshakeIcon}
                label="Client Loyalty Rate"
                description="Share of returning clients who have placed more than one order with your workshop. Loyalty measures long-term trust and satisfaction."
                value={(data.breakdown.loyaltyRate ?? 0) * 100}
                color="#6d28d9"
              />

              <Card
                sx={{
                  p: 3,
                  borderRadius: '16px',
                  bgcolor: alpha('#1a2340', 0.03),
                  border: '1px solid',
                  borderColor: alpha('#1a2340', 0.06),
                }}
              >
                <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', mb: 1.5 }}>
                  How StitchScore Is Calculated
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.8 }}>
                  StitchScore is a weighted composite: <strong>On-Time Rate (50%)</strong> + <strong>Integrity Rate (30%)</strong> + <strong>Loyalty Rate (20%)</strong>.
                  A minimum of 10 completed orders is required to activate scoring. The score is recalculated live after each completed or resolved event.
                </Typography>
              </Card>
            </Stack>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};
