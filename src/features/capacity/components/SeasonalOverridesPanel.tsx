import React, { useState } from 'react';
import {
  Box,
  Typography,
  Stack,
  Button,
  Chip,
  CircularProgress,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  IconButton,
  Tooltip,
  alpha,
} from '@mui/material';
import AddCircleOutlineOutlinedIcon from '@mui/icons-material/AddCircleOutlineOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import EventRepeatOutlinedIcon from '@mui/icons-material/EventRepeatOutlined';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { seasonalOverridesApi, type SeasonalOverride } from '../seasonal-overrides.api';

const QUERY_KEY = ['capacity', 'seasonal-overrides'] as const;

function getOverrideStatus(override: SeasonalOverride): 'active' | 'upcoming' | 'expired' {
  const now = new Date();
  const start = new Date(override.startsAt);
  const end = new Date(override.endsAt);
  if (now >= start && now <= end) return 'active';
  if (now < start) return 'upcoming';
  return 'expired';
}

function StatusChip({ status }: { status: 'active' | 'upcoming' | 'expired' }) {
  if (status === 'active') {
    return (
      <Chip
        label="Active"
        size="small"
        sx={{ height: 20, fontSize: '10px', fontWeight: 800, bgcolor: alpha('#f5a623', 0.12), color: '#a06a00', borderRadius: '5px' }}
      />
    );
  }
  if (status === 'upcoming') {
    return (
      <Chip
        label="Upcoming"
        size="small"
        sx={{ height: 20, fontSize: '10px', fontWeight: 700, bgcolor: alpha('#2563eb', 0.08), color: '#2563eb', borderRadius: '5px' }}
      />
    );
  }
  return (
    <Chip
      label="Expired"
      size="small"
      sx={{ height: 20, fontSize: '10px', fontWeight: 700, bgcolor: alpha('#6b7280', 0.1), color: '#6b7280', borderRadius: '5px' }}
    />
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
}

interface OverrideRowProps {
  override: SeasonalOverride;
}

function OverrideRow({ override }: OverrideRowProps) {
  const queryClient = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: () => seasonalOverridesApi.delete(override.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const status = getOverrideStatus(override);

  return (
    <Box
      sx={{
        p: 2,
        border: '1px solid',
        borderColor: status === 'active' ? alpha('#f5a623', 0.4) : 'divider',
        borderRadius: 2,
        bgcolor: status === 'active' ? alpha('#fff8e6', 0.6) : 'background.paper',
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.75 }}>
            <Typography variant="body2" fontWeight={800} noWrap>{override.label}</Typography>
            <StatusChip status={status} />
          </Stack>
          <Typography variant="caption" color="text.secondary">
            {formatDate(override.startsAt)} – {formatDate(override.endsAt)}
          </Typography>
          <Box sx={{ mt: 0.75 }}>
            <Chip
              label={`Limit: ${override.capacityLimit}`}
              size="small"
              sx={{ height: 20, fontSize: '10px', fontWeight: 700, bgcolor: alpha('#1e5c3a', 0.08), color: '#1e5c3a', borderRadius: '5px' }}
            />
          </Box>
        </Box>

        <Box sx={{ flexShrink: 0 }}>
          {confirmDelete ? (
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="caption" color="error" fontWeight={700}>Are you sure?</Typography>
              <Button
                size="small"
                color="error"
                variant="contained"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                sx={{ borderRadius: 1.5, fontSize: '11px', minWidth: 0, px: 1.5 }}
              >
                {deleteMutation.isPending ? <CircularProgress size={12} color="inherit" /> : 'Delete'}
              </Button>
              <Button
                size="small"
                onClick={() => setConfirmDelete(false)}
                sx={{ borderRadius: 1.5, fontSize: '11px', minWidth: 0, px: 1.5, color: 'text.secondary' }}
              >
                Cancel
              </Button>
            </Stack>
          ) : (
            <Tooltip title="Delete override">
              <IconButton
                size="small"
                onClick={() => setConfirmDelete(true)}
                sx={{ color: 'text.disabled', '&:hover': { color: 'error.main' } }}
              >
                <DeleteOutlineOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Stack>
    </Box>
  );
}

function AddOverrideDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [label, setLabel] = useState('');
  const [capacityLimit, setCapacityLimit] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [error409, setError409] = useState(false);
  const [dateError, setDateError] = useState(false);

  const createMutation = useMutation({
    mutationFn: () =>
      seasonalOverridesApi.create({
        label: label.trim(),
        capacityLimit: Number(capacityLimit),
        startsAt,
        endsAt,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      setLabel(''); setCapacityLimit(''); setStartsAt(''); setEndsAt('');
      setError409(false);
      onClose();
    },
    onError: (err: any) => {
      if (err?.response?.status === 409) setError409(true);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError409(false);
    if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) {
      setDateError(true);
      return;
    }
    setDateError(false);
    createMutation.mutate();
  }

  function handleClose() {
    setError409(false);
    setDateError(false);
    onClose();
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: '20px', p: 1 } }}>
      <form onSubmit={handleSubmit}>
        <DialogTitle sx={{ fontWeight: 800 }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <EventRepeatOutlinedIcon sx={{ color: 'primary.main', fontSize: 20 }} />
            <span>Add Seasonal Override</span>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            {error409 && (
              <Alert severity="warning" sx={{ borderRadius: '12px', fontSize: '12px' }}>
                This date range overlaps with an existing override
              </Alert>
            )}
            {dateError && (
              <Alert severity="error" sx={{ borderRadius: '12px', fontSize: '12px' }}>
                End date must be after start date
              </Alert>
            )}
            <TextField
              label="Label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              fullWidth
              size="small"
              required
              placeholder="e.g. December Rush 2026"
              InputProps={{ sx: { borderRadius: '12px' } }}
            />
            <TextField
              label="Capacity Limit"
              value={capacityLimit}
              onChange={(e) => setCapacityLimit(e.target.value)}
              fullWidth
              size="small"
              required
              type="number"
              inputProps={{ min: 1, step: 1 }}
              placeholder="Maximum concurrent orders"
              InputProps={{ sx: { borderRadius: '12px' } }}
            />
            <TextField
              label="Starts At"
              type="date"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              fullWidth
              size="small"
              required
              InputLabelProps={{ shrink: true }}
              InputProps={{ sx: { borderRadius: '12px' } }}
            />
            <TextField
              label="Ends At"
              type="date"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              fullWidth
              size="small"
              required
              InputLabelProps={{ shrink: true }}
              InputProps={{ sx: { borderRadius: '12px' } }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button onClick={handleClose} sx={{ color: 'text.secondary', borderRadius: '10px' }}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={createMutation.isPending}
            sx={{ borderRadius: '10px', fontWeight: 700, px: 3 }}
          >
            {createMutation.isPending ? 'Saving…' : 'Add Override'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

export function SeasonalOverridesPanel() {
  const [addOpen, setAddOpen] = useState(false);

  const { data: overrides = [], isLoading } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: seasonalOverridesApi.list,
  });

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h6" fontWeight={800}>Seasonal Overrides</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Temporarily cap order intake for busy seasons or periods of reduced capacity.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<AddCircleOutlineOutlinedIcon />}
          onClick={() => setAddOpen(true)}
          sx={{
            borderRadius: 2,
            fontWeight: 700,
            fontSize: '13px',
            textTransform: 'none',
            borderColor: alpha('#1e5c3a', 0.4),
            color: '#1e5c3a',
            '&:hover': { borderColor: '#1e5c3a', bgcolor: alpha('#1e5c3a', 0.04) },
          }}
        >
          Add Override
        </Button>
      </Stack>

      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={24} />
        </Box>
      )}

      {!isLoading && overrides.length === 0 && (
        <Box
          sx={{
            py: 5,
            textAlign: 'center',
            border: '1px dashed',
            borderColor: 'divider',
            borderRadius: 3,
          }}
        >
          <EventRepeatOutlinedIcon sx={{ fontSize: 36, color: 'text.disabled', mb: 1 }} />
          <Typography variant="body2" color="text.secondary">
            No seasonal overrides configured
          </Typography>
        </Box>
      )}

      {overrides.length > 0 && (
        <Stack spacing={1.5}>
          {overrides.map((o) => (
            <OverrideRow key={o.id} override={o} />
          ))}
        </Stack>
      )}

      <AddOverrideDialog open={addOpen} onClose={() => setAddOpen(false)} />
    </Box>
  );
}
