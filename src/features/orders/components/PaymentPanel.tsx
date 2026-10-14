import { useState } from 'react';
import {
  Box,
  Typography,
  Stack,
  Card,
  Button,
  Collapse,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  LinearProgress,
  CircularProgress,
  Alert,
  alpha,
  Divider,
} from '@mui/material';
import AddCircleOutlineOutlinedIcon from '@mui/icons-material/AddCircleOutlineOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  paymentsApi,
  formatNaira,
  nairaToKobo,
  type PaymentMethod,
  type PaymentIntent,
} from '../payments.api';

const METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Cash',
  transfer: 'Bank Transfer',
  card: 'Card',
  pos: 'POS',
  other: 'Other',
};

const INTENT_LABELS: Record<PaymentIntent, string> = {
  deposit: 'Deposit',
  installment: 'Instalment',
  final: 'Final Payment',
  full_upfront: 'Full Upfront',
};

interface PaymentPanelProps {
  orderId: string;
}

export function PaymentPanel({ orderId }: PaymentPanelProps) {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [amountNaira, setAmountNaira] = useState('');
  const [method, setMethod] = useState<PaymentMethod | ''>('');
  const [intent, setIntent] = useState<PaymentIntent | ''>('');
  const [notes, setNotes] = useState('');

  const { data: summary, isLoading, isError } = useQuery({
    queryKey: ['orders', orderId, 'payments', 'summary'],
    queryFn: () => paymentsApi.getSummary(orderId),
  });

  const recordMutation = useMutation({
    mutationFn: () =>
      paymentsApi.recordPayment(orderId, {
        amount: nairaToKobo(parseFloat(amountNaira)),
        payment_method: method as PaymentMethod,
        payment_intent: intent as PaymentIntent,
        notes: notes.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders', orderId, 'payments', 'summary'] });
      queryClient.invalidateQueries({ queryKey: ['orders', orderId] });
      setFormOpen(false);
      setAmountNaira('');
      setMethod('');
      setIntent('');
      setNotes('');
    },
  });

  const canSubmit =
    !!amountNaira &&
    parseFloat(amountNaira) > 0 &&
    method !== '' &&
    intent !== '' &&
    !recordMutation.isPending;

  const paidPct =
    summary?.totalAgreed && summary.totalAgreed > 0
      ? Math.min(100, (summary.totalPaid / summary.totalAgreed) * 100)
      : null;

  return (
    <Card className="sf-card" sx={{ p: 3, borderRadius: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <PaymentsOutlinedIcon sx={{ color: 'primary.main', fontSize: 20 }} />
          <Typography variant="h6" fontWeight={800}>
            Payment Ledger
          </Typography>
        </Stack>
        <Button
          size="small"
          variant={formOpen ? 'outlined' : 'contained'}
          startIcon={<AddCircleOutlineOutlinedIcon />}
          onClick={() => setFormOpen((v) => !v)}
          sx={{
            borderRadius: 2,
            fontWeight: 700,
            fontSize: '11px',
            textTransform: 'none',
            ...(formOpen
              ? { borderColor: alpha('#1e5c3a', 0.4), color: '#1e5c3a' }
              : { bgcolor: '#1e5c3a', '&:hover': { bgcolor: '#256b45' } }),
          }}
        >
          {formOpen ? 'Cancel' : 'Add Payment'}
        </Button>
      </Stack>

      {/* Summary */}
      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
          <CircularProgress size={24} />
        </Box>
      )}

      {isError && (
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          Failed to load payment summary.
        </Alert>
      )}

      {summary && (
        <Box sx={{ mb: 2 }}>
          {paidPct !== null ? (
            <>
              <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.75 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                  {formatNaira(summary.totalPaid)} paid of {formatNaira(summary.totalAgreed!)}
                </Typography>
                <Typography variant="caption" sx={{ fontWeight: 800, color: 'primary.main' }}>
                  {Math.round(paidPct)}%
                </Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={paidPct}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  bgcolor: alpha('#1e5c3a', 0.1),
                  '& .MuiLinearProgress-bar': { borderRadius: 4, bgcolor: 'primary.main' },
                }}
              />
            </>
          ) : (
            <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.secondary' }}>
              {formatNaira(summary.totalPaid)} paid{' '}
              <Typography component="span" variant="caption" sx={{ color: 'text.disabled', fontStyle: 'italic' }}>
                (agreed price not set)
              </Typography>
            </Typography>
          )}

          {summary.outstandingBalance > 0 && (
            <Box
              sx={{
                mt: 1.5,
                px: 2,
                py: 1,
                borderRadius: 2,
                bgcolor: 'rgba(196, 154, 26, 0.08)',
                border: '1px solid rgba(196, 154, 26, 0.2)',
              }}
            >
              <Typography variant="caption" sx={{ fontWeight: 800, color: '#8a6d1a' }}>
                Outstanding: {formatNaira(summary.outstandingBalance)}
              </Typography>
            </Box>
          )}
        </Box>
      )}

      {/* Record Payment form */}
      <Collapse in={formOpen} unmountOnExit>
        <Box
          sx={{
            mt: 1,
            mb: 2,
            p: 2.5,
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: alpha('#f8f7f4', 0.6),
          }}
        >
          <Typography
            variant="caption"
            sx={{ fontWeight: 800, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: 1, mb: 2, display: 'block' }}
          >
            Record New Payment
          </Typography>
          <Stack spacing={2}>
            <TextField
              fullWidth
              size="small"
              label="Amount (₦)"
              value={amountNaira}
              onChange={(e) => {
                const v = e.target.value.replace(/[^0-9.]/g, '');
                if ((v.match(/\./g) ?? []).length <= 1) setAmountNaira(v);
              }}
              inputProps={{ inputMode: 'decimal' }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              helperText={
                amountNaira && parseFloat(amountNaira) > 0
                  ? `= ${formatNaira(nairaToKobo(parseFloat(amountNaira)))}`
                  : undefined
              }
            />

            <FormControl fullWidth size="small" required>
              <InputLabel>Payment Method</InputLabel>
              <Select
                value={method}
                label="Payment Method"
                onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                sx={{ borderRadius: 2 }}
              >
                {(Object.entries(METHOD_LABELS) as [PaymentMethod, string][]).map(([v, l]) => (
                  <MenuItem key={v} value={v}>{l}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth size="small" required>
              <InputLabel>Payment Intent</InputLabel>
              <Select
                value={intent}
                label="Payment Intent"
                onChange={(e) => setIntent(e.target.value as PaymentIntent)}
                sx={{ borderRadius: 2 }}
              >
                {(Object.entries(INTENT_LABELS) as [PaymentIntent, string][]).map(([v, l]) => (
                  <MenuItem key={v} value={v}>{l}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              size="small"
              label="Notes (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              multiline
              maxRows={3}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />

            {recordMutation.isError && (
              <Alert severity="error" sx={{ borderRadius: 2 }}>
                Failed to record payment. Please try again.
              </Alert>
            )}

            <Button
              fullWidth
              variant="contained"
              disabled={!canSubmit}
              onClick={() => recordMutation.mutate()}
              sx={{
                borderRadius: 2,
                fontWeight: 700,
                textTransform: 'none',
                bgcolor: '#1e5c3a',
                '&:hover': { bgcolor: '#256b45' },
              }}
            >
              {recordMutation.isPending ? <CircularProgress size={18} sx={{ color: 'white' }} /> : 'Record Payment'}
            </Button>
          </Stack>
        </Box>
      </Collapse>

      {/* Payment records table */}
      {summary && summary.records.length > 0 && (
        <>
          <Divider sx={{ mb: 1.5 }} />
          <Typography
            variant="caption"
            sx={{ fontWeight: 800, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: 1, mb: 1, display: 'block' }}
          >
            History
          </Typography>
          <Stack divider={<Divider />}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr auto',
                px: 1,
                py: 0.75,
                bgcolor: alpha('#f8f7f4', 0.8),
                borderRadius: 1,
              }}
            >
              {['Date', 'Method', 'Intent', 'Amount'].map((h) => (
                <Typography key={h} variant="caption" sx={{ fontWeight: 800, color: 'text.disabled', fontSize: '10px', textTransform: 'uppercase' }}>
                  {h}
                </Typography>
              ))}
            </Box>
            {summary.records.map((rec) => (
              <Box
                key={rec.id}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr auto',
                  px: 1,
                  py: 1,
                  '&:hover': { bgcolor: alpha('#f8f7f4', 0.5) },
                  borderRadius: 1,
                }}
              >
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                  {new Date(rec.createdAt).toLocaleDateString('en-NG')}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                  {METHOD_LABELS[rec.paymentMethod]}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                  {INTENT_LABELS[rec.paymentIntent]}
                </Typography>
                <Typography variant="caption" sx={{ fontWeight: 800, color: 'primary.dark', whiteSpace: 'nowrap' }}>
                  {formatNaira(rec.amount)}
                </Typography>
              </Box>
            ))}
          </Stack>
        </>
      )}

      {summary && summary.records.length === 0 && !formOpen && (
        <Typography variant="body2" sx={{ color: 'text.disabled', fontStyle: 'italic', textAlign: 'center', py: 2 }}>
          No payments recorded yet.
        </Typography>
      )}
    </Card>
  );
}
