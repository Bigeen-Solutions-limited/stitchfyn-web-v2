import { Box, Typography, Button, CircularProgress, Stack, alpha } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';

interface LoadingProps {
  label?: string;
  size?: 'sm' | 'md';
}

export function QueryLoading({ label, size = 'md' }: LoadingProps) {
  const spinSize = size === 'sm' ? 18 : 24;
  const py = size === 'sm' ? 3 : 5;
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py, gap: 1.5 }}>
      <CircularProgress size={spinSize} sx={{ color: 'primary.main' }} />
      {label && (
        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
          {label}
        </Typography>
      )}
    </Box>
  );
}

interface ErrorProps {
  message?: string;
  onRetry?: () => void;
  size?: 'sm' | 'md';
}

export function QueryError({ message = 'Something went wrong. Please try again.', onRetry, size = 'md' }: ErrorProps) {
  const py = size === 'sm' ? 3 : 5;
  return (
    <Box
      sx={{
        py,
        px: 3,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        border: '1px dashed',
        borderColor: alpha('#ef4444', 0.3),
        borderRadius: '12px',
        bgcolor: alpha('#ef4444', 0.02),
      }}
    >
      <Stack spacing={1.5} alignItems="center">
        <ErrorOutlineIcon sx={{ fontSize: size === 'sm' ? 24 : 32, color: alpha('#ef4444', 0.6) }} />
        <Typography variant={size === 'sm' ? 'caption' : 'body2'} sx={{ color: 'text.secondary', maxWidth: 320 }}>
          {message}
        </Typography>
        {onRetry && (
          <Button
            size="small"
            onClick={onRetry}
            sx={{ mt: 0.5, textTransform: 'none', fontWeight: 600, color: 'primary.main' }}
          >
            Try again
          </Button>
        )}
      </Stack>
    </Box>
  );
}

interface EmptyProps {
  message?: string;
  hint?: string;
  action?: React.ReactNode;
  size?: 'sm' | 'md';
}

export function QueryEmpty({ message = 'Nothing here yet.', hint, action, size = 'md' }: EmptyProps) {
  const py = size === 'sm' ? 3 : 5;
  return (
    <Box
      sx={{
        py,
        px: 3,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        border: '1px dashed',
        borderColor: 'divider',
        borderRadius: '12px',
      }}
    >
      <Stack spacing={1} alignItems="center">
        <InboxOutlinedIcon sx={{ fontSize: size === 'sm' ? 24 : 32, color: 'text.disabled', mb: 0.5 }} />
        <Typography variant={size === 'sm' ? 'caption' : 'body2'} sx={{ fontWeight: 600, color: 'text.secondary' }}>
          {message}
        </Typography>
        {hint && (
          <Typography variant="caption" sx={{ color: 'text.disabled' }}>
            {hint}
          </Typography>
        )}
        {action && <Box sx={{ mt: 1 }}>{action}</Box>}
      </Stack>
    </Box>
  );
}
