import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Card, Typography, Stack, TextField, Button,
  CircularProgress, Alert, Collapse, Grow, LinearProgress,
} from '@mui/material';
import { LockReset as LockResetIcon } from '@mui/icons-material';
import { changePasswordApi } from '../features/auth/auth.api';
import { useAuthStore } from '../features/auth/auth.store';

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

export function ChangePasswordPage() {
  const navigate = useNavigate();
  const { user, setAuth, accessToken } = useAuthStore();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isForcedChange = user?.mustChangePassword === true;
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

    setLoading(true);
    setError(null);

    try {
      await changePasswordApi(currentPassword, newPassword);
      if (user && accessToken) {
        setAuth(accessToken, { ...user, mustChangePassword: false });
      }
      navigate(user?.role === 'SYSTEM_ADMIN' ? '/system-admin' : '/dashboard', { replace: true });
    } catch (err: any) {
      const code = err?.response?.data?.code;
      const message = err?.response?.data?.message;
      if (code === 'AUTHORIZATION_ERROR') {
        setError('Current password is incorrect.');
      } else if (code === 'VALIDATION_ERROR') {
        setError(message ?? 'Password does not meet the requirements.');
      } else {
        setError('Something went wrong. Please try again.');
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
          <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="center" sx={{ mb: 3 }}>
            <Box component="img" src="/logo-icon.png" alt="" sx={{ height: 32, width: 'auto' }} />
            <Typography variant="h5" sx={{ color: '#1e5c3a', fontWeight: 700, letterSpacing: -0.5 }}>
              StitchFyn
            </Typography>
          </Stack>

          {isForcedChange && (
            <Box sx={{ mb: 3, p: 2, bgcolor: 'rgba(30,92,58,0.06)', borderRadius: '10px', border: '1px solid rgba(30,92,58,0.15)' }}>
              <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
                <LockResetIcon sx={{ color: '#1e5c3a', fontSize: 20 }} />
                <Typography variant="body2" sx={{ color: '#1e5c3a', fontWeight: 600 }}>
                  You must set a new password before continuing
                </Typography>
              </Stack>
            </Box>
          )}

          <Typography variant="h4" sx={{ color: '#1a2340', fontWeight: 700, mb: 1, fontSize: '26px' }}>
            {isForcedChange ? 'Create your password' : 'Change password'}
          </Typography>
          <Typography variant="body2" sx={{ color: '#6b7280', mb: 3 }}>
            {isForcedChange
              ? 'Your account was created with a temporary password. Please set a permanent one now.'
              : 'Enter your current password and choose a new one.'}
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
                placeholder={isForcedChange ? 'Temporary password' : 'Current password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
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
                    <Typography variant="caption" sx={{ color: '#6b7280' }}>Strength</Typography>
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
                disabled={loading || !allRequirementsMet || !passwordsMatch || !currentPassword}
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
                {loading ? <CircularProgress size={24} sx={{ color: 'white' }} /> : 'Set new password'}
              </Button>
            </Stack>
          </Box>
        </Card>
      </Grow>
    </Box>
  );
}
