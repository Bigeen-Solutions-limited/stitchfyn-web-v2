import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  Card, 
  Typography, 
  Stack, 
  TextField, 
  Button, 
  Select, 
  MenuItem, 
  Divider, 
  IconButton, 
  Link, 
  Chip,
  Grow,
  CircularProgress,
  Alert,
  Collapse
} from '@mui/material';
import {
  Phone as PhoneIcon,
  Mail as MailIcon, 
  Google as GoogleIcon, 
  Apple as AppleIcon, 
  Facebook as FacebookIcon,
  ArrowForward as ArrowRightIcon,
  DarkMode as DarkModeIcon
} from '@mui/icons-material';
import { loginApi } from '../features/auth/auth.api';
import { useAuthStore } from '../features/auth/auth.store';
import { mapErrorCode } from '../utils/errorMapper';

export function LoginPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  
  const [loginMethod, setLoginMethod] = useState<'phone' | 'email'>('email');
  const [loading, setLoading] = useState(false);
  const [showCard, setShowCard] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setShowCard(true);
  }, []);

  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    // Phone login isn't built on the server yet, so this only simulates it
    setTimeout(() => {
      setLoading(false);
      setError('Phone authentication is currently unavailable. Please use Email login.');
    }, 1500);
  };

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
        height: '100vh',
        width: '100vw',
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
              StitchFYN
            </Typography>
          </Stack>

          <Typography variant="h4" sx={{ color: '#1a2340', fontWeight: 700, mb: 1, fontSize: '26px', fontFamily: 'var(--sf-font-heading)' }}>
            Welcome back.
          </Typography>
          <Typography variant="body2" sx={{ color: '#6b7280', mb: 3 }}>
            Sign in to your workshop.
          </Typography>

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

          {loginMethod === 'phone' ? (
            <Box component="form" onSubmit={handlePhoneSubmit}>
              <Stack spacing={3}>
                <Stack direction="row" spacing={2}>
                  <Select
                    defaultValue="+1"
                    sx={{
                      width: '110px',
                      height: '52px',
                      borderRadius: '10px',
                      bgcolor: 'white',
                      textAlign: 'left',
                      '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e5e4e0' },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#1e5c3a', borderWidth: '1px' },
                      '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#1e5c3a' }
                    }}
                  >
                    <MenuItem value="+1">🇺🇸 +1</MenuItem>
                    <MenuItem value="+44">🇬🇧 +44</MenuItem>
                    <MenuItem value="+91">🇮🇳 +91</MenuItem>
                  </Select>
                  <TextField
                    fullWidth
                    placeholder="000 000 0000"
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
                </Stack>

                <Button
                  variant="contained"
                  fullWidth
                  type="submit"
                  disabled={loading}
                  endIcon={!loading && <ArrowRightIcon />}
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
                  {loading ? <CircularProgress size={24} sx={{ color: 'white' }} /> : 'Send OTP'}
                </Button>
              </Stack>
            </Box>
          ) : (
            <Box component="form" onSubmit={handleEmailSubmit}>
              <Stack spacing={2.5}>
                <TextField
                  fullWidth
                  placeholder="Email address"
                  type="email"
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
                  inputProps={{ minLength: 6 }}
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
          )}

          <Divider sx={{ my: 4, '&::before, &::after': { borderColor: '#e5e4e0' } }}>
            <Typography variant="caption" sx={{ color: '#6b7280', px: 1, fontWeight: 500 }}>
              or continue with
            </Typography>
          </Divider>

          <Button
            variant="outlined"
            fullWidth
            startIcon={loginMethod === 'phone' ? <MailIcon /> : <PhoneIcon />}
            onClick={() => {
              setLoginMethod(loginMethod === 'phone' ? 'email' : 'phone');
              setError(null);
            }}
            sx={{
              height: '52px',
              borderRadius: '10px',
              borderColor: '#e5e4e0',
              color: '#1a2340',
              textTransform: 'none',
              fontSize: '15px',
              fontWeight: 600,
              mb: 3,
              '&:hover': { borderColor: '#1e5c3a', bgcolor: 'rgba(30, 92, 58, 0.04)' }
            }}
          >
            Continue with {loginMethod === 'phone' ? 'Email' : 'Phone'}
          </Button>

          <Stack direction="row" spacing={2} justifyContent="center" sx={{ mb: 4 }}>
            {[
              { icon: <GoogleIcon />, label: 'Google' },
              { icon: <AppleIcon />, label: 'Apple' },
              { icon: <FacebookIcon />, label: 'Facebook' }
            ].map((social, index) => (
              <IconButton
                key={index}
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: '12px',
                  border: '1px solid #e5e4e0',
                  bgcolor: '#fafaf8',
                  color: '#1a2340',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    borderColor: '#1e5c3a',
                    color: '#1e5c3a',
                    bgcolor: 'white'
                  }
                }}
              >
                {social.icon}
              </IconButton>
            ))}
          </Stack>

          <Typography variant="caption" sx={{ color: '#6b7280', fontSize: '12px', display: 'block', maxWidth: 320, mx: 'auto', lineHeight: 1.5 }}>
            By continuing, you agree to our{' '}
            <Link href="#" underline="hover" sx={{ color: '#1e5c3a', fontWeight: 600 }}>Terms of Service</Link>
            {' '}and{' '}
            <Link href="#" underline="hover" sx={{ color: '#1e5c3a', fontWeight: 600 }}>Privacy Policy</Link>
          </Typography>
        </Card>
      </Grow>

      {/* Theme Toggle Pill */}
      <Box sx={{ position: 'fixed', bottom: 32 }}>
        <Chip
          icon={<DarkModeIcon sx={{ fontSize: '18px !important', color: '#6b7280 !important' }} />}
          label="Switch Theme"
          sx={{
            bgcolor: 'white',
            border: '1px solid #e5e4e0',
            borderRadius: '999px',
            px: 1,
            height: '40px',
            cursor: 'pointer',
            fontWeight: 500,
            color: '#6b7280',
            transition: 'all 0.2s ease',
            '&:hover': { bgcolor: '#fafaf8', borderColor: '#d1d0cb' }
          }}
        />
      </Box>
    </Box>
  );
}
