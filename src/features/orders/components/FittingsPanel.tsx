import React, { useState } from 'react';
import {
  Box,
  Typography,
  Stack,
  Button,
  Chip,
  Alert,
  CircularProgress,
  TextField,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  alpha,
} from '@mui/material';
import EventOutlinedIcon from '@mui/icons-material/EventOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import BuildOutlinedIcon from '@mui/icons-material/BuildOutlined';
import EventBusyOutlinedIcon from '@mui/icons-material/EventBusyOutlined';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import ScheduleOutlinedIcon from '@mui/icons-material/ScheduleOutlined';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fittingsApi, type FittingOutcome, type FittingAppointment } from '../fittings.api';
import type { Garment } from '../orders.api';

interface Props {
  orderId: string;
  garments: Garment[];
  isOrderCompleted: boolean;
  hasAvailableTransitions: boolean;
}

const OUTCOME_META: Record<FittingOutcome, { label: string; color: string; bg: string; icon: React.ReactElement }> = {
  passed: {
    label: 'Passed',
    color: '#1e5c3a',
    bg: alpha('#1e5c3a', 0.1),
    icon: <CheckCircleOutlinedIcon sx={{ fontSize: 14 }} />,
  },
  adjustments_required: {
    label: 'Adjustments required',
    color: '#a06a00',
    bg: alpha('#f5a623', 0.12),
    icon: <BuildOutlinedIcon sx={{ fontSize: 14 }} />,
  },
  no_show: {
    label: 'No show',
    color: '#c0392b',
    bg: alpha('#c0392b', 0.08),
    icon: <EventBusyOutlinedIcon sx={{ fontSize: 14 }} />,
  },
  cancelled: {
    label: 'Cancelled',
    color: '#6b7280',
    bg: alpha('#6b7280', 0.1),
    icon: <CancelOutlinedIcon sx={{ fontSize: 14 }} />,
  },
};

const PENDING_META = {
  label: 'Scheduled',
  color: '#2563eb',
  bg: alpha('#2563eb', 0.08),
  icon: <ScheduleOutlinedIcon sx={{ fontSize: 14 }} />,
};

function OutcomeChip({ outcome }: { outcome: FittingOutcome | null }) {
  const meta = outcome ? OUTCOME_META[outcome] : PENDING_META;
  return (
    <Chip
      size="small"
      icon={meta.icon}
      label={meta.label}
      sx={{
        height: 22,
        fontSize: '11px',
        fontWeight: 700,
        borderRadius: '6px',
        bgcolor: meta.bg,
        color: meta.color,
        border: '1px solid',
        borderColor: alpha(meta.color, 0.25),
        '& .MuiChip-icon': { color: 'inherit', ml: '5px' },
      }}
    />
  );
}

interface ScheduleDialogProps {
  open: boolean;
  onClose: () => void;
  orderId: string;
  garments: Garment[];
}

function ScheduleDialog({ open, onClose, orderId, garments }: ScheduleDialogProps) {
  const queryClient = useQueryClient();
  const [garmentId, setGarmentId] = useState(garments[0]?.id ?? '');
  const [scheduledAt, setScheduledAt] = useState('');
  const [notes, setNotes] = useState('');

  const createMutation = useMutation({
    mutationFn: () =>
      fittingsApi.create(orderId, {
        garmentId,
        scheduledAt: new Date(scheduledAt).toISOString(),
        notes: notes.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fittings', orderId] });
      setScheduledAt('');
      setNotes('');
      onClose();
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!scheduledAt || !garmentId) return;
    createMutation.mutate();
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: '20px', p: 1 } }}>
      <form onSubmit={handleSubmit}>
        <DialogTitle sx={{ fontWeight: 800 }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <EventOutlinedIcon sx={{ color: 'primary.main', fontSize: 20 }} />
            <span>Schedule Fitting</span>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            {garments.length > 1 && (
              <TextField
                label="Garment"
                select
                value={garmentId}
                onChange={(e) => setGarmentId(e.target.value)}
                fullWidth
                size="small"
                required
                InputProps={{ sx: { borderRadius: '12px' } }}
              >
                {garments.map((g) => (
                  <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>
                ))}
              </TextField>
            )}
            <TextField
              label="Date & Time"
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              fullWidth
              size="small"
              required
              InputLabelProps={{ shrink: true }}
              InputProps={{ sx: { borderRadius: '12px' } }}
            />
            <TextField
              label="Notes (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              fullWidth
              multiline
              rows={2}
              size="small"
              placeholder="Any special requirements or context"
              InputProps={{ sx: { borderRadius: '12px' } }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button onClick={onClose} sx={{ color: 'text.secondary', borderRadius: '10px' }}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={createMutation.isPending || !scheduledAt || !garmentId}
            sx={{ borderRadius: '10px', fontWeight: 700, px: 3 }}
          >
            {createMutation.isPending ? 'Scheduling…' : 'Schedule'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

function AppointmentCard({ appointment, orderId }: { appointment: FittingAppointment; orderId: string }) {
  const queryClient = useQueryClient();
  const outcomeMutation = useMutation({
    mutationFn: (outcome: FittingOutcome) =>
      fittingsApi.recordOutcome(orderId, appointment.id, { outcome }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['fittings', orderId] }),
  });

  return (
    <Box
      sx={{
        p: 2,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        bgcolor: 'background.paper',
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
        <Box>
          <Typography variant="body2" fontWeight={700}>
            {new Date(appointment.scheduledAt).toLocaleString('en-NG', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Typography>
          {appointment.notes && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.25, display: 'block' }}>
              {appointment.notes}
            </Typography>
          )}
        </Box>
        <OutcomeChip outcome={appointment.outcome} />
      </Stack>

      {/* Only until an outcome is recorded */}
      {appointment.outcome === null && (
        <TextField
          select
          label="Record outcome"
          size="small"
          value=""
          onChange={(e) => outcomeMutation.mutate(e.target.value as FittingOutcome)}
          disabled={outcomeMutation.isPending}
          sx={{ mt: 1.5, minWidth: 200, '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
          SelectProps={{ displayEmpty: true }}
        >
          <MenuItem value="" disabled>Select outcome…</MenuItem>
          {(Object.keys(OUTCOME_META) as FittingOutcome[]).map((o) => (
            <MenuItem key={o} value={o}>{OUTCOME_META[o].label}</MenuItem>
          ))}
        </TextField>
      )}
    </Box>
  );
}

export function FittingsPanel({ orderId, garments, isOrderCompleted, hasAvailableTransitions }: Props) {
  const [scheduleOpen, setScheduleOpen] = useState(false);

  const { data: fittings = [], isLoading } = useQuery({
    queryKey: ['fittings', orderId],
    queryFn: () => fittingsApi.list(orderId),
  });

  const hasPassed = fittings.some((f) => f.outcome === 'passed');
  // Warn when the order can't move on and no fitting has passed yet
  const showGateWarning = !hasPassed && (isOrderCompleted || !hasAvailableTransitions);

  return (
    <Box sx={{ pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
        <Typography
          variant="caption"
          sx={{ fontWeight: 800, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: 1 }}
        >
          Fitting Appointments
        </Typography>
        <Button
          size="small"
          variant="outlined"
          startIcon={<EventOutlinedIcon />}
          onClick={() => setScheduleOpen(true)}
          sx={{
            borderRadius: 2,
            fontWeight: 700,
            fontSize: '11px',
            textTransform: 'none',
            borderColor: alpha('#1e5c3a', 0.4),
            color: '#1e5c3a',
            '&:hover': { borderColor: '#1e5c3a', bgcolor: alpha('#1e5c3a', 0.04) },
          }}
        >
          Schedule Fitting
        </Button>
      </Stack>

      {showGateWarning && (
        <Alert severity="warning" sx={{ mb: 2, borderRadius: 2, fontSize: '12px' }}>
          A passed fitting appointment is required before this order can proceed past the Finishing stage.
        </Alert>
      )}

      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
          <CircularProgress size={20} />
        </Box>
      )}

      {!isLoading && fittings.length === 0 && (
        <Typography variant="body2" sx={{ color: 'text.disabled', fontStyle: 'italic' }}>
          No fitting appointments scheduled yet.
        </Typography>
      )}

      {fittings.length > 0 && (
        <Stack spacing={1.5}>
          {fittings.map((apt) => (
            <AppointmentCard key={apt.id} appointment={apt} orderId={orderId} />
          ))}
        </Stack>
      )}

      <ScheduleDialog
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        orderId={orderId}
        garments={garments}
      />
    </Box>
  );
}
