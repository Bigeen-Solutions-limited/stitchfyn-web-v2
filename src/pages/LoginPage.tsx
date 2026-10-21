import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Box, 
  Card, 
  Typography, 
  Stack, 
  TextField, 
  Button, 
  Link, 
  Grow,
  CircularProgress,
  Alert,
  Collapse
} from '@mui/material';
import { loginApi } from '../features/auth/auth.api';
import { useAuthStore } from '../features/auth/auth.store';
import { mapErrorCode } from '../utils/errorMapper';
import { errorMessages } from '../lib/errors/error-messages';
import { BRAND_NAME } from '../config/brand';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setAuth, sessionExpired } = useAuthStore();
  const arrivedFrom = location.state as { emailVerified?: boolean; passwordReset?: boolean } | null;
  const notice = arrivedFrom?.emailVerified
    ? 'Email verified. Sign in with the password you just set.'
    : arrivedFrom?.passwordReset
      ? 'Password updated. Sign in with your new password.'
      : null;
  
  const [loading, setLoading] = useState(false);
  const [showCard, setShowCard] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setShowCard(true);
  }, []);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { accessToken, user } = await loginApi({ email, password });
      setAuth(accessToken, user);

      if (user.mustChangePassword) {
        navigate('/change-password', { replace: true });
      } else if (user.role === 'SYSTEM_ADMIN') {
        navigate('/system-admin', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err: any) {
      if (!err.response) {
        setError('Network error. Please check your connection.');
      } else {
        const code = err.response.data?.code;
        setError(mapErrorCode(code));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        width: '100%',
        bgcolor: '#f5f4f0',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        p: 2
      }}
    >
      <Grow in={showCard} timeout={400}>
        <Card
          sx={{
            maxWidth: 480,
            width: '100%',
            p: { xs: 4, md: 5 },
            bgcolor: '#fafaf8',
            border: '1px solid #e5e4e0',
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.04)',
            textAlign: 'center'
          }}
        >
          {/* Logo Lockup */}
          <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="center" sx={{ mb: 4 }}>
            <Box component="img" src="/logo-icon.png" alt="" sx={{ height: 28, width: 'auto' }} />
            <Typography
              sx={{
                fontFamily: 'var(--sf-font-display)',
                fontWeight: 600,
                fontSize: '1.6rem',
                letterSpacing: '0.01em',
                color: '#1e5c3a',
                lineHeight: 1,
              }}
            >
              {BRAND_NAME}
            </Typography>
          </Stack>

          <Typography variant="h4" sx={{ color: '#1a2340', fontWeight: 700, mb: 1, fontSize: '26px', fontFamily: 'var(--sf-font-heading)' }}>
            Welcome back.
          </Typography>
          <Typography variant="body2" sx={{ color: '#6b7280', mb: 3 }}>
            Sign in to your workshop.
          </Typography>

          {sessionExpired && !error && (
            <Alert severity="warning" sx={{ mb: 3, borderRadius: '10px', textAlign: 'left' }}>
              <strong>{errorMessages.AUTH_SESSION_EXPIRED.title}.</strong> {errorMessages.AUTH_SESSION_EXPIRED.detail}
            </Alert>
          )}

          {notice && !error && (
            <Alert severity="success" sx={{ mb: 3, borderRadius: '10px', textAlign: 'left' }}>
              {notice}
            </Alert>
          )}

          <Collapse in={!!error}>
            <Box sx={{ mb: 3 }}>
              {error && (
                <Alert 
                  severity="error" 
                  sx={{ 
                    borderRadius: '10px',
                    bgcolor: 'rgba(239, 68, 68, 0.05)',
                    color: '#EF4444',
                    '& .MuiAlert-icon': { color: '#EF4444' },
                    textAlign: 'left'
                  }}
                >
                  {error}
                </Alert>
              )}
            </Box>
          </Collapse>

            <Box component="form" onSubmit={handleEmailSubmit}>
              <Stack spacing={2.5}>
                <TextField
                  fullWidth
                  placeholder="Email address"
                  type="email"
                  autoComplete="email"
                  inputProps={{ 'aria-label': 'Email address' }}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      height: '52px',
                      borderRadius: '10px',
                      bgcolor: 'white',
                      '& fieldset': { borderColor: '#e5e4e0' },
                      '&:hover fieldset': { borderColor: '#1e5c3a' },
                      '&.Mui-focused fieldset': { borderColor: '#1e5c3a', borderWidth: '1px' }
                    }
                  }}
                />
                <TextField
                  fullWidth
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  inputProps={{ minLength: 6, 'aria-label': 'Password' }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      height: '52px',
                      borderRadius: '10px',
                      bgcolor: 'white',
                      '& fieldset': { borderColor: '#e5e4e0' },
                      '&:hover fieldset': { borderColor: '#1e5c3a' },
                      '&.Mui-focused fieldset': { borderColor: '#1e5c3a', borderWidth: '1px' }
                    }
                  }}
                />
                <Box sx={{ textAlign: 'right', mt: -1 }}>
                  <Link
                    href="/forgot-password"
                    underline="hover"
                    sx={{ color: '#1e5c3a', fontSize: '13px', fontWeight: 500 }}
                  >
                    Forgot password?
                  </Link>
                </Box>
                <Button
                  variant="contained"
                  fullWidth
                  type="submit"
                  disabled={loading}
                  sx={{
                    height: '52px',
                    borderRadius: '10px',
                    bgcolor: '#1e5c3a',
                    textTransform: 'none',
                    fontSize: '16px',
                    fontWeight: 600,
                    boxShadow: 'none',
                    '&:hover': { bgcolor: '#256b45', boxShadow: 'none' }
                  }}
                >
                  {loading ? <CircularProgress size={24} sx={{ color: 'white' }} /> : 'Sign In'}
                </Button>
              </Stack>
            </Box>
        </Card>
      </Grow>
    </Box>
  );
}
