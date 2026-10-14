import { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Stack, Typography, FormControl, InputLabel, Select, MenuItem, TextField,
} from '@mui/material';
import { useOrders } from '../hooks/useOrders.ts';
import { useReassignGarment } from '../hooks/useReassignGarment.ts';

interface ReassignFabricDialogProps {
  open: boolean;
  onClose: () => void;
  garmentId: string;
  garmentName: string;
  currentOrderId: string;
}

export function ReassignFabricDialog({
  open, onClose, garmentId, garmentName, currentOrderId,
}: ReassignFabricDialogProps) {
  const { data: ordersPage } = useOrders(1, 100);
  const { mutate: reassign, isPending } = useReassignGarment(currentOrderId);
  const [targetOrderId, setTargetOrderId] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (open) {
      setTargetOrderId('');
      setReason('');
    }
  }, [open]);

  // The order list has one row per garment, so remove repeated orders
  const targets = [
    ...new Map(
      (ordersPage?.items ?? []).filter((o) => o.id !== currentOrderId).map((o) => [o.id, o] as const),
    ).values(),
  ];
  const canSubmit = !!targetOrderId && reason.trim().length > 0 && !isPending;

  const handleSubmit = () => {
    if (!canSubmit) return;
    reassign(
      { garmentId, targetOrderId, reason: reason.trim() },
      {
        onSuccess: () => onClose(),
      },
    );
  };

  return (
    <Dialog
      open={open}
      onClose={isPending ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ className: 'sf-glass sf-card', sx: { borderRadius: 3 } }}
    >
      <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>Reassign Fabric</DialogTitle>
      <DialogContent sx={{ pb: 1 }}>
        <Stack spacing={3} sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Move <strong>{garmentName}</strong> and its fabric record to another order. The move is recorded in the audit trail.
          </Typography>
          <FormControl fullWidth size="small">
            <InputLabel id="reassign-target-label">Target order</InputLabel>
            <Select
              labelId="reassign-target-label"
              label="Target order"
              value={targetOrderId}
              onChange={(e) => setTargetOrderId(e.target.value as string)}
              sx={{ borderRadius: 2 }}
            >
              {targets.length === 0 && (
                <MenuItem value="" disabled><em>No other orders available</em></MenuItem>
              )}
              {targets.map((o) => (
                <MenuItem key={o.id} value={o.id}>
                  #{o.orderNumber} — {o.customerName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Reason"
            required
            multiline
            minRows={2}
            size="small"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={isPending} sx={{ color: 'text.primary' }}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={!canSubmit}>
          {isPending ? 'Reassigning…' : 'Reassign'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
