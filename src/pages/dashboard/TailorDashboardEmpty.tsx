import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Card,
  Grid,
  alpha,
  keyframes,
} from '@mui/material';
import {
  ContentCut as Scissors,
  AddCircle as PlusCircle,
  PersonAdd as UserPlus,
  Schedule as CalendarClock,
  Inventory as Package,
  Add as Plus,
} from '@mui/icons-material';

const pulse = keyframes`
  0%   { transform: scale(1); }
  50%  { transform: scale(1.05); }
  100% { transform: scale(1); }
`;

interface QuickStartTipProps {
  title: string;
  subtitle: string;
  icon: React.ElementType;
  accentColor: string;
  onClick: () => void;
}

function QuickStartTip({ title, subtitle, icon: Icon, accentColor, onClick }: QuickStartTipProps) {
  return (
    <Card
      onClick={onClick}
      elevation={0}
      sx={{
        p: 3,
        backgroundImage: 'none',
        bgcolor: 'var(--sf-parchment)',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: '16px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          borderColor: 'var(--sf-green)',
          boxShadow: '0 8px 16px rgba(0,0,0,0.04)',
        },
      }}
    >
      <Box
        sx={{
          width: 44,
          height: 44,
          borderRadius: '10px',
          bgcolor: alpha(accentColor, 0.08),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 2,
          color: accentColor,
        }}
      >
        <Icon sx={{ fontSize: 22 }} />
      </Box>
      <Typography variant="body1" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
        {title}
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {subtitle}
      </Typography>
    </Card>
  );
}

export const TailorDashboardEmpty: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        maxWidth: 900,
        mx: 'auto',
        pt: { xs: 4, md: 8 },
        pb: 8,
        px: 2,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      {/* Empty state */}
      <Card
        elevation={0}
        sx={{
          maxWidth: 640,
          width: '100%',
          p: { xs: 4, md: 6 },
          backgroundImage: 'none',
          bgcolor: 'var(--sf-parchment)',
          border: '2px dashed',
          borderColor: 'divider',
          borderRadius: '24px',
          textAlign: 'center',
          mb: 6,
        }}
      >
        <Box
          sx={{
            width: 88,
            height: 88,
            borderRadius: '50%',
            bgcolor: alpha('#1e5c3a', 0.07),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: 4,
            animation: `${pulse} 2.5s infinite ease-in-out`,
            '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
          }}
        >
          <Scissors sx={{ fontSize: 44, color: 'var(--sf-green)' }} />
        </Box>

        <Typography variant="h5" sx={{ color: 'text.primary', fontWeight: 700, mb: 1.5 }}>
          Your workshop is ready.
        </Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary', mb: 4, maxWidth: 400, mx: 'auto', lineHeight: 1.6 }}>
          No orders yet. Create your first to start tracking garments through the production floor.
        </Typography>

        <Button
          variant="contained"
          onClick={() => navigate('/orders/new')}
          startIcon={<PlusCircle />}
          sx={{
            bgcolor: 'var(--sf-green)',
            height: 48,
            px: 5,
            borderRadius: '999px',
            textTransform: 'none',
            fontSize: '15px',
            fontWeight: 700,
            boxShadow: '0 4px 12px rgba(30,92,58,0.2)',
            '&:hover': { bgcolor: 'var(--sf-green-dark)' },
          }}
        >
          Create your first order
        </Button>
      </Card>

      {/* Quick start */}
      <Box sx={{ width: '100%', maxWidth: 820 }}>
        <Typography variant="subtitle1" sx={{ color: 'text.primary', fontWeight: 700, mb: 3 }}>
          Get started
        </Typography>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <QuickStartTip
              title="Add a customer"
              subtitle="Build your digital fitting book."
              icon={UserPlus}
              accentColor="var(--sf-green)"
              onClick={() => navigate('/customers')}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <QuickStartTip
              title="Set a deadline"
              subtitle="Never miss a fitting session."
              icon={CalendarClock}
              accentColor="var(--sf-gold)"
              onClick={() => navigate('/orders')}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <QuickStartTip
              title="Log inventory"
              subtitle="Track fabrics and materials."
              icon={Package}
              accentColor="var(--sf-navy)"
              onClick={() => navigate('/inventory')}
            />
          </Grid>
        </Grid>
      </Box>

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
