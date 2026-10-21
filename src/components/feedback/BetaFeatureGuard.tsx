import { 
  Box, 
  Typography, 
  Button, 
  alpha,
  Paper,
  Stack
} from '@mui/material';
import { 
  Lock as LockIcon,
  AutoAwesome as MagicIcon,
  ArrowBack as BackIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { BRAND_NAME } from '../../config/brand';

interface BetaFeatureGuardProps {
  featureName: string;
}

export function BetaFeatureGuard({ featureName }: BetaFeatureGuardProps) {
  const navigate = useNavigate();

  return (
    <Box 
      sx={{ 
        height: 'calc(100vh - 120px)', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        p: 3
      }}
    >
      <Paper 
        className="sf-glass"
        sx={{ 
          p: 6, 
          maxWidth: 500, 
          textAlign: 'center', 
          borderRadius: '32px',
          border: '1px solid',
          borderColor: alpha('#fff', 0.1),
          boxShadow: '0 20px 80px rgba(0,0,0,0.1)'
        }}
      >
        <Stack spacing={3} alignItems="center">
          <Box 
            sx={{ 
              width: 80, 
              height: 80, 
              borderRadius: '24px', 
              bgcolor: alpha('#1e5c3a', 0.1),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'primary.main',
              mb: 1
            }}
          >
            <LockIcon sx={{ fontSize: 40 }} />
          </Box>
          
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
              {featureName}
            </Typography>
            <Typography variant="overline" sx={{ fontWeight: 800, color: 'primary.main', letterSpacing: 2 }}>
              Beta Version 1.0
            </Typography>
          </Box>

          <Typography variant="body1" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
            The <strong>{featureName}</strong> module is currently in active development for the {BRAND_NAME} v1.1 release. 
            We're building sophisticated physical-to-digital processing to ensure professional accuracy.
          </Typography>

          <Box sx={{ 
            p: 2, 
            bgcolor: alpha('#c49a1a', 0.05), 
            borderRadius: '16px', 
            border: '1px dashed',
            borderColor: alpha('#c49a1a', 0.3),
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 2
          }}>
            <MagicIcon sx={{ color: '#c49a1a' }} />
            <Typography variant="caption" sx={{ textAlign: 'left', fontWeight: 600, color: '#926f12' }}>
              Coming Soon: Automated measurement drift detection and integrated digital payment ledger.
            </Typography>
          </Box>

          <Button 
            variant="outlined" 
            startIcon={<BackIcon />}
            onClick={() => navigate('/dashboard')}
            sx={{ 
              borderRadius: '12px', 
              px: 4, 
              fontWeight: 700,
              textTransform: 'none'
            }}
          >
            Return to Dashboard
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
