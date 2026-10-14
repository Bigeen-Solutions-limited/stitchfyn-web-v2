import { Box, Card, Typography, CircularProgress, Stack, LinearProgress, alpha, Grid, Button } from '@mui/material';
import { WorkspacePremium as WorkspacePremiumIcon, OpenInNew as OpenInNewIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useStitchScore } from '../useStitchScore';

export const StitchScoreCard: React.FC = () => {
  const { data, isLoading, isError } = useStitchScore();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Card sx={{ p: 4, borderRadius: '16px', backgroundImage: 'none', bgcolor: 'background.paper', minHeight: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress size={24} sx={{ color: 'var(--sf-green)' }} />
      </Card>
    );
  }

  if (isError || !data) {
    return (
      <Card sx={{ p: 4, borderRadius: '16px', backgroundImage: 'none', bgcolor: 'background.paper', minHeight: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="body2" color="text.secondary">Unable to load StitchScore</Typography>
      </Card>
    );
  }

  const { score, status, thresholdProgress, isFoundingMember, breakdown } = data;

  if (status === 'INSUFFICIENT_DATA' || status === 'QUALIFYING') {
    return (
      <Card sx={{ p: { xs: 3, md: 4 }, borderRadius: '16px', backgroundImage: 'none', bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
        <Stack spacing={3}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#1a2340', mb: 1 }}>
              StitchScore
            </Typography>
            <Typography variant="body1" sx={{ color: '#6b7280', maxWidth: '500px' }}>
              Building your Reputation Capital. Your StitchScore will be unlocked once you establish a consistent track record of completed orders.
            </Typography>
          </Box>

          <Box sx={{ bgcolor: alpha('#1e5c3a', 0.05), p: 3, borderRadius: '16px' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1e5c3a' }}>
                Qualifying Phase
              </Typography>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1e5c3a' }}>
                {thresholdProgress} / 10 Orders
              </Typography>
            </Stack>
            <LinearProgress 
              variant="determinate" 
              value={(thresholdProgress / 10) * 100} 
              sx={{ 
                height: 10, 
                borderRadius: 5,
                bgcolor: alpha('#1e5c3a', 0.1),
                '& .MuiLinearProgress-bar': { bgcolor: '#1e5c3a', borderRadius: 5 }
              }} 
            />
          </Box>
        </Stack>
      </Card>
    );
  }

  return (
    <Card sx={{ p: { xs: 3, md: 4 }, borderRadius: '16px', backgroundImage: 'none', bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', position: 'relative', overflow: 'hidden' }}>
      {isFoundingMember && (
        <Box sx={{ position: 'absolute', top: 20, right: 20, display: 'flex', alignItems: 'center', gap: 0.5, color: '#d97706' }}>
          <WorkspacePremiumIcon fontSize="small" />
          <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Founding Member</Typography>
        </Box>
      )}

      <Grid container spacing={4} alignItems="center">
        {/* Score Ring */}
        <Grid size={{ xs: 12, md: 4 }} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Box sx={{ position: 'relative', display: 'inline-flex' }}>
            <CircularProgress
              variant="determinate"
              value={100}
              size={140}
              thickness={4}
              sx={{ color: alpha('#1e5c3a', 0.1) }}
            />
            <CircularProgress
              variant="determinate"
              value={score || 0}
              size={140}
              thickness={4}
              sx={{ 
                color: score && score >= 80 ? '#1e5c3a' : score && score >= 60 ? '#d97706' : '#dc2626',
                position: 'absolute', 
                left: 0 
              }}
            />
            <Box
              sx={{
                top: 0, left: 0, bottom: 0, right: 0,
                position: 'absolute',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column'
              }}
            >
              <Typography variant="h3" component="div" sx={{ fontWeight: 900, color: '#1a2340', letterSpacing: '-0.02em', lineHeight: 1 }}>
                {score}
              </Typography>
            </Box>
          </Box>
          <Typography variant="subtitle1" sx={{ mt: 2, fontWeight: 800, color: '#1a2340' }}>
            StitchScore
          </Typography>
          <Typography variant="caption" sx={{ color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Reputation Index
          </Typography>
        </Grid>

        {/* Breakdowns */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Stack spacing={3}>
            <MetricBar label="On-time delivery" value={(breakdown.onTimeRate || 0) * 100} color="var(--sf-green)" />
            <MetricBar label="Zero-dispute integrity" value={(breakdown.integrityRate || 0) * 100} color="var(--sf-navy)" />
            <MetricBar label="Client loyalty" value={(breakdown.loyaltyRate || 0) * 100} color="var(--sf-gold)" />
            <Button
              size="small"
              endIcon={<OpenInNewIcon sx={{ fontSize: 14 }} />}
              onClick={() => navigate('/stitch-score')}
              sx={{ alignSelf: 'flex-start', color: '#1e5c3a', fontWeight: 700, textTransform: 'none', fontSize: '12px', p: 0 }}
            >
              View Full Report
            </Button>
          </Stack>
        </Grid>
      </Grid>
    </Card>
  );
};

const MetricBar = ({ label, value, color }: { label: string, value: number, color: string }) => (
  <Box>
    <Stack direction="row" justifyContent="space-between" alignItems="flex-end" sx={{ mb: 1 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1a2340' }}>{label}</Typography>
      <Typography variant="body2" sx={{ fontWeight: 800, color }}>{Math.round(value)}%</Typography>
    </Stack>
    <LinearProgress 
      variant="determinate" 
      value={value} 
      sx={{ 
        height: 8, 
        borderRadius: 4,
        bgcolor: alpha(color, 0.1),
        '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 4 }
      }} 
    />
  </Box>
);
