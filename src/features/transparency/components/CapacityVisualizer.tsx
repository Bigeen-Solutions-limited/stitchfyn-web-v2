import { Box, Typography, LinearProgress, alpha } from '@mui/material';
import { useProjection } from '../hooks/useProjection';

export const CapacityVisualizer: React.FC = () => {
  const { data, isLoading, isStale } = useProjection();

  if (isLoading) return <Box sx={{ height: 60, bgcolor: 'rgba(0,0,0,0.02)', borderRadius: 2 }} />;

  // No store projection (e.g. an owner not tied to one store) reads as no data, not as still loading
  const uiHint = data?.uiHint || 'GRAY';
  const displayStatus = data?.displayStatus || 'No data';
  const utilization = data?.capacity.utilization ?? 0;

  const getColor = () => {
    if (isStale) return '#9CA3AF'; // Grey for stale
    switch (uiHint) {
      case 'RED': return '#EF4444';
      case 'AMBER': return '#F59E0B';
      case 'GRAY': return '#9CA3AF'; // no data looks like stale data, never a made-up "all good"
      case 'GREEN':
      default: return '#10B981';
    }
  };

  const color = getColor();

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, alignItems: 'center' }}>
        <Typography variant="caption" sx={{ fontWeight: 800, color: '#6b7280', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          Workshop Capacity
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color }} />
          <Typography variant="caption" noWrap sx={{ fontWeight: 800, color: color }}>
            {isStale ? 'STATUS UNKNOWN' : displayStatus.toUpperCase()}
          </Typography>
        </Box>
      </Box>
      <LinearProgress
        variant="determinate"
        value={isStale ? 0 : Math.min(utilization, 100)}
        sx={{
          height: 8,
          borderRadius: 4,
          bgcolor: alpha(color, 0.1),
          '& .MuiLinearProgress-bar': {
            bgcolor: color,
            borderRadius: 4,
          },
        }}
      />
      {isStale && (
        <Typography variant="caption" sx={{ color: '#9CA3AF', fontStyle: 'italic', mt: 0.5, display: 'block' }}>
          Sync delayed. Please check connection.
        </Typography>
      )}
    </Box>
  );
};
