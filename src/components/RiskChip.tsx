import type { ChipProps } from '@mui/material';
import { Chip, useTheme } from '@mui/material';

export type RiskStatus = 'ON_TRACK' | 'AT_RISK' | 'OVERDUE' | 'UNKNOWN';

interface RiskChipProps extends Omit<ChipProps, 'color'> {
  status: RiskStatus;
}

// The only component allowed to use the risk colours for status
export function RiskChip({ status, sx, ...props }: RiskChipProps) {
  const theme = useTheme();

  const getStatusColor = () => {
    switch (status) {
      case 'ON_TRACK':
        return theme.palette.risk.onTrack;
      case 'AT_RISK':
        return theme.palette.risk.atRisk;
      case 'OVERDUE':
        return theme.palette.risk.overdue;
      case 'UNKNOWN':
      default:
        return theme.palette.risk.unknown;
    }
  };

  return (
    <Chip
      {...props}
      sx={{
        backgroundColor: getStatusColor(),
        color: '#FFFFFF',
        fontWeight: 600,
        ...sx,
      }}
    />
  );
}
