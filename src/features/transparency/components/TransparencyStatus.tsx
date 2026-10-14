import { Box, Typography, alpha, Tooltip } from '@mui/material';
import { Security as SecurityIcon, Sync as SyncIcon } from '@mui/icons-material';
import { useProjection } from '../hooks/useProjection';

export const TransparencyStatus: React.FC = () => {
  const { data, isStale, isLoading } = useProjection();

  if (isLoading) return null;

  const uiHint = data?.uiHint || 'GREEN';
  const displayStatus = data?.displayStatus || 'Nominal';

  const getColor = () => {
    if (isStale) return '#9CA3AF'; // Grey
    switch (uiHint) {
      case 'RED': return '#EF4444';
      case 'AMBER': return '#F59E0B';
      case 'GRAY': return '#9CA3AF'; // no data looks like stale data, never a made-up "all good"
      default: return '#10B981';
    }
  };

  const color = getColor();

  return (
    <Tooltip title={isStale ? "Data sync is delayed beyond 5 minutes." : `Guardian Status: ${displayStatus}`}>
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 1.5,
          px: 2,
          py: 0.75,
          borderRadius: '12px',
          bgcolor: alpha(color, 0.08),
          border: `1px solid ${alpha(color, 0.2)}`,
          transition: 'all 0.3s ease',
        }}
      >
        {isStale ? (
          <SyncIcon sx={{ fontSize: 16, color: color, animation: 'spin 2s linear infinite' }} />
        ) : (
          <SecurityIcon sx={{ fontSize: 16, color: color }} />
        )}
        <Typography
          variant="caption"
          sx={{
            fontWeight: 800,
            color: color,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            fontSize: '11px'
          }}
        >
          {isStale ? 'STATUS UNKNOWN' : displayStatus}
        </Typography>
        
        <style>
          {`
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          `}
        </style>
      </Box>
    </Tooltip>
  );
};
