import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box, Card, Typography, Stack, TextField, Button,
  CircularProgress, Alert, Collapse, Grow, LinearProgress,
} from '@mui/material';
import { resetPasswordApi } from '../features/auth/auth.api';

function getStrength(password: string): { score: number; label: string; color: string } {
  if (!password) return { score: 0, label: '', color: '#e5e4e0' };
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (score <= 1) return { score: score * 25, label: 'Weak', color: '#ef4444' };
  if (score === 2) return { score: 50, label: 'Fair', color: '#f59e0b' };
  if (score === 3) return { score: 75, label: 'Good', color: '#3b82f6' };
  return { score: 100, label: 'Strong', color: '#1e5c3a' };
}

const REQUIREMENTS = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'One uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'One lowercase letter', test: (p: string) => /[a-z]/.test(p) },
  { label: 'One number', test: (p: string) => /[0-9]/.test(p) },
];

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const strength = getStrength(newPassword);
  const allRequirementsMet = REQUIREMENTS.every(r => r.test(newPassword));
  const passwordsMatch = newPassword === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allRequirementsMet) {
      setError('Password does not meet the requirements below.');
      return;
    }
    if (!passwordsMatch) {
      setError('Passwords do not match.');
      return;
    }
    if (!token) {
      setError('Reset link is missing or invalid. Please request a new one.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await resetPasswordApi(token, newPassword);
      navigate('/login', { replace: true, state: { passwordReset: true } });
    } catch (err: any) {
      const code = err?.response?.data?.code;
      if (code === 'AUTHORIZATION_ERROR') {
        setError('This reset link is invalid or has expired. Please request a new one.');
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <Box sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f5f4f0' }}>
        <Alert severity="error" sx={{ maxWidth: 400 }}>
          Invalid reset link. Please request a new password reset.
        </Alert>
      </Box>
    );
  }

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

          <Typography variant="h4" sx={{ color: '#1a2340', fontWeight: 700, mb: 1, fontSize: '28px' }}>
            Set new password
          </Typography>
          <Typography variant="body2" sx={{ color: '#6b7280', mb: 3 }}>
            Choose a strong password for your account.
          </Typography>

          <Collapse in={!!error}>
            {error && (
              <Alert severity="error" sx={{ mb: 3, borderRadius: '10px', textAlign: 'left' }}>
                {error}
              </Alert>
            )}
          </Collapse>

          <Box component="form" onSubmit={handleSubmit}>
            <Stack spacing={2.5}>
              <TextField
                fullWidth
                type="password"
                placeholder="New password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
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

              {newPassword && (
                <Box sx={{ textAlign: 'left' }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                    <Typography variant="caption" sx={{ color: '#6b7280' }}>Password strength</Typography>
                    <Typography variant="caption" sx={{ color: strength.color, fontWeight: 600 }}>{strength.label}</Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={strength.score}
                    sx={{
                      height: 4,
                      borderRadius: 2,
                      bgcolor: '#e5e4e0',
                      '& .MuiLinearProgress-bar': { bgcolor: strength.color, borderRadius: 2 },
                    }}
                  />
                  <Stack spacing={0.5} sx={{ mt: 1.5 }}>
                    {REQUIREMENTS.map(req => (
                      <Typography
                        key={req.label}
                        variant="caption"
                        sx={{
                          color: req.test(newPassword) ? '#1e5c3a' : '#9ca3af',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.5,
                        }}
                      >
                        {req.test(newPassword) ? '✓' : '○'} {req.label}
                      </Typography>
                    ))}
                  </Stack>
                </Box>
              )}

              <TextField
                fullWidth
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                error={!!confirmPassword && !passwordsMatch}
                helperText={confirmPassword && !passwordsMatch ? 'Passwords do not match' : ''}
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
                disabled={loading || !allRequirementsMet || !passwordsMatch}
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
                {loading ? <CircularProgress size={24} sx={{ color: 'white' }} /> : 'Reset password'}
              </Button>
            </Stack>
          </Box>
        </Card>
      </Grow>
    </Box>
  );
}
