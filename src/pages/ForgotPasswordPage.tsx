import React, { useState } from 'react';
import { Box, Card, Typography, Stack, TextField, Button, CircularProgress, Alert, Collapse, Grow } from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import { forgotPasswordApi } from '../features/auth/auth.api';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError(null);

    try {
      await forgotPasswordApi(email.trim().toLowerCase());
      setSubmitted(true);
    } catch {
      // Always show the generic message — never leak whether email exists
      setSubmitted(true);
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
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
      }}
    >
      <Grow in timeout={400}>
        <Card
          sx={{
            maxWidth: 480,
            width: '100%',
            p: { xs: 4, md: 5 },
            bgcolor: '#fafaf8',
            border: '1px solid #e5e4e0',
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.04)',
            textAlign: 'center',
          }}
        >
          <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="center" sx={{ mb: 4 }}>
            <Box component="img" src="/logo-icon.png" alt="" sx={{ height: 28, width: 'auto' }} />            <Typography              sx={{                fontFamily: 'var(--sf-font-display)',                fontWeight: 600,                fontSize: '1.6rem',                letterSpacing: '0.01em',                color: '#1e5c3a',                lineHeight: 1,              }}            >              StitchFYN            </Typography>
          </Stack>

          {submitted ? (
            <>
              <Typography variant="h5" sx={{ color: '#1a2340', fontWeight: 700, mb: 2 }}>
                Check your email
              </Typography>
              <Typography variant="body2" sx={{ color: '#6b7280', mb: 4, lineHeight: 1.7 }}>
                If an account with that email address exists, you'll receive a password reset link shortly. Check your spam folder if you don't see it within a few minutes.
              </Typography>
              <Button
                component={RouterLink}
                to="/login"
                startIcon={<ArrowBackIcon />}
                sx={{ color: '#1e5c3a', textTransform: 'none', fontWeight: 600 }}
              >
                Back to sign in
              </Button>
            </>
          ) : (
            <>
              <Typography variant="h4" sx={{ color: '#1a2340', fontWeight: 700, mb: 1, fontSize: '28px' }}>
                Forgot password?
              </Typography>
              <Typography variant="body2" sx={{ color: '#6b7280', mb: 3 }}>
                Enter your email and we'll send you a reset link.
              </Typography>

              <Collapse in={!!error}>
                {error && (
                  <Alert severity="error" sx={{ mb: 3, borderRadius: '10px', textAlign: 'left' }}>
                    {error}
                  </Alert>
                )}
              </Collapse>

              <Box component="form" onSubmit={handleSubmit}>
                <Stack spacing={3}>
                  <TextField
                    fullWidth
                    type="email"
                    placeholder="Email address"
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
                        '&.Mui-focused fieldset': { borderColor: '#1e5c3a', borderWidth: '1px' },
                      },
                    }}
                  />
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
                      '&:hover': { bgcolor: '#256b45', boxShadow: 'none' },
                    }}
                  >
                    {loading ? <CircularProgress size={24} sx={{ color: 'white' }} /> : 'Send reset link'}
                  </Button>
                  <Button
                    component={RouterLink}
                    to="/login"
                    startIcon={<ArrowBackIcon />}
                    sx={{ color: '#6b7280', textTransform: 'none', fontWeight: 500 }}
                  >
                    Back to sign in
                  </Button>
                </Stack>
              </Box>
            </>
          )}
        </Card>
      </Grow>
    </Box>
  );
}
