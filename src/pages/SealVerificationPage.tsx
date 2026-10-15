import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Stack,
  CircularProgress,
  Grid,
  alpha,
} from '@mui/material';
import VerifiedOutlinedIcon from '@mui/icons-material/VerifiedOutlined';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { publicSealApi } from '../features/orders/seal.api';

export function SealVerificationPage() {
  const { code } = useParams<{ code: string }>();

  const { data: seal, isLoading, error } = useQuery({
    queryKey: ['public-seal', code],
    queryFn: () => publicSealApi.getPublicSeal(code!),
    enabled: !!code,
    retry: false,
  });

  const is404 = (error as any)?.response?.status === 404;

  if (isLoading) {
    return (
      <Box sx={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f8f7f4' }}>
        <Stack alignItems="center" spacing={2}>
          <CircularProgress sx={{ color: '#1e5c3a' }} />
          <Typography variant="body2" sx={{ color: '#6b6b6b' }}>Verifying fabric seal…</Typography>
        </Stack>
      </Box>
    );
  }

  if (error || !seal) {
    return (
      <Box sx={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f8f7f4', px: 3 }}>
        <Stack alignItems="center" spacing={2} sx={{ maxWidth: 360, textAlign: 'center' }}>
          <ErrorOutlineIcon sx={{ fontSize: 56, color: '#c0392b' }} />
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#1a1a1a' }}>
            {is404 ? 'Code Not Found' : 'Verification Failed'}
          </Typography>
          <Typography variant="body2" sx={{ color: '#6b6b6b' }}>
            {is404
              ? 'This verification code was not found. Please check the code and try again, or contact the tailor directly.'
              : 'Unable to verify this seal. Please try again later.'}
          </Typography>
        </Stack>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        bgcolor: '#f8f7f4',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        px: { xs: 2, sm: 4 },
        py: { xs: 4, sm: 6 },
      }}
    >
      <Typography
        sx={{
          fontFamily: '"Playfair Display", serif',
          fontSize: { xs: '1.5rem', sm: '1.75rem' },
          fontWeight: 800,
          color: '#1e5c3a',
          letterSpacing: '-0.01em',
          mb: 4,
        }}
      >
        StitchFYN
      </Typography>

      {/* Main card */}
      <Box
        sx={{
          width: '100%',
          maxWidth: 480,
          bgcolor: '#ffffff',
          borderRadius: '20px',
          border: '1px solid #e5e0d8',
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
          overflow: 'hidden',
        }}
      >
        {/* Green hero band */}
        <Box
          sx={{
            bgcolor: '#1e5c3a',
            px: 3,
            py: 4,
            textAlign: 'center',
          }}
        >
          <VerifiedOutlinedIcon sx={{ fontSize: 56, color: '#ffffff', mb: 1.5 }} />
          <Typography
            variant="h4"
            sx={{ fontWeight: 800, color: '#ffffff', letterSpacing: '-0.01em', mb: 0.5 }}
          >
            Fabric Protected
          </Typography>
          <Typography variant="body2" sx={{ color: alpha('#ffffff', 0.8) }}>
            This fabric has been documented and verified by StitchFYN
          </Typography>
        </Box>

        {/* QR code */}
        <Box sx={{ textAlign: 'center', pt: 3, pb: 1 }}>
          <Box
            component="img"
            src={seal.qrCodeDataUrl}
            alt={`QR code for ${seal.verification_code}`}
            sx={{ width: 200, height: 200, display: 'inline-block' }}
          />
        </Box>

        {/* Verification code */}
        <Box sx={{ textAlign: 'center', pb: 3 }}>
          <Typography variant="caption" sx={{ color: '#6b6b6b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, fontSize: '10px' }}>
            Verification Code
          </Typography>
          <Typography
            sx={{
              fontFamily: 'monospace',
              fontSize: '1.4rem',
              fontWeight: 800,
              color: '#1e5c3a',
              letterSpacing: '0.06em',
              mt: 0.25,
            }}
          >
            {seal.verification_code}
          </Typography>
        </Box>

        {/* Details grid */}
        <Box sx={{ px: 3, pb: 3 }}>
          <Box sx={{ borderRadius: '12px', border: '1px solid #e5e0d8', overflow: 'hidden' }}>
            <Grid container>
              {[
                ['Tailor', seal.tailor_name],
                ['Business', seal.business_name],
                ['Date Logged', new Date(seal.date_logged).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })],
                ['Quantity', seal.quantity_confirmed],
              ].map(([label, value], idx) => (
                <Grid size={{ xs: 6 }} key={label}>
                  <Box
                    sx={{
                      px: 2,
                      py: 1.5,
                      borderRight: idx % 2 === 0 ? '1px solid #e5e0d8' : 'none',
                      borderBottom: idx < 2 ? '1px solid #e5e0d8' : 'none',
                      bgcolor: idx % 2 === 0 ? alpha('#1e5c3a', 0.02) : '#ffffff',
                    }}
                  >
                    <Typography variant="caption" sx={{ fontWeight: 800, color: '#6b6b6b', textTransform: 'uppercase', fontSize: '9px', letterSpacing: 0.8, display: 'block' }}>
                      {label}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#1a1a1a', mt: 0.25 }}>
                      {value}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Box>
        </Box>

        <Box sx={{ borderTop: '1px solid #e5e0d8', px: 3, py: 2, textAlign: 'center' }}>
          <Typography variant="caption" sx={{ color: '#6b6b6b' }}>
            Protected by{' '}
            <Typography component="span" variant="caption" sx={{ fontWeight: 800, color: '#1e5c3a' }}>
              StitchFYN
            </Typography>
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
