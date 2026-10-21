import {
  Box,
  Typography,
  Stack,
  Button,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  alpha,
} from '@mui/material';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import SmsOutlinedIcon from '@mui/icons-material/SmsOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { sealApi } from '../seal.api';
import { BRAND_NAME } from '../../../config/brand';

interface FabricSealPanelProps {
  orderId: string;
  garmentId: string;
  // Recorded at intake; confirming only acknowledges it
  quantity: number | null;
  quantityUnit: string | null;
}

const PUBLIC_BASE_URL = import.meta.env.VITE_PUBLIC_BASE_URL ?? window.location.origin;

function handleShare(verificationCode: string) {
  const url = `${PUBLIC_BASE_URL}/public/seals/${verificationCode}`;
  const text = `My fabric is protected by ${BRAND_NAME}. Verify at: ${url}`;

  if (navigator.share) {
    navigator.share({ text }).catch(() => {/* user cancelled */});
  } else {
    window.open(`sms:?body=${encodeURIComponent(text)}`);
  }
}

export function FabricSealPanel({ orderId, garmentId, quantity, quantityUnit }: FabricSealPanelProps) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const hasQuantity = quantity !== null && quantity !== undefined && !!quantityUnit;

  const { data: seal, isLoading, error } = useQuery({
    queryKey: ['seal', orderId, garmentId],
    queryFn: () => sealApi.getGarmentSeal(orderId, garmentId),
    retry: (failureCount, err: any) => {
      if (err?.response?.status === 404) return false;
      return failureCount < 2;
    },
  });

  const is404 = (error as any)?.response?.status === 404;

  const confirmMutation = useMutation({
    mutationFn: () => sealApi.confirmFabric(garmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seal', orderId, garmentId] });
      queryClient.invalidateQueries({ queryKey: ['orders', orderId] });
      setDialogOpen(false);
    },
  });

  // Confirmation is permanent, so keep the button disabled once it succeeds
  const alreadyConfirming = confirmMutation.isPending || confirmMutation.isSuccess;

  return (
    <Box sx={{ pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
      <Typography
        variant="caption"
        sx={{ fontWeight: 800, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: 1, mb: 1.5, display: 'block' }}
      >
        Fabric Safety Seal
      </Typography>

      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
          <CircularProgress size={20} />
        </Box>
      )}

      {(is404 || (!seal && !isLoading)) && (
        <Stack spacing={1.5} sx={{ py: 1 }}>
          <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="space-between">
            <Stack direction="row" spacing={1.5} alignItems="center">
              <ShieldOutlinedIcon sx={{ fontSize: 20, color: 'text.disabled' }} />
              <Typography variant="body2" sx={{ color: 'text.disabled', fontStyle: 'italic' }}>
                {alreadyConfirming ? 'Generating seal…' : 'Not yet confirmed'}
              </Typography>
            </Stack>
            <Button
              size="small"
              variant="outlined"
              startIcon={alreadyConfirming ? <CircularProgress size={14} /> : <CheckCircleOutlinedIcon />}
              disabled={alreadyConfirming}
              onClick={() => setDialogOpen(true)}
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
              Confirm Fabric
            </Button>
          </Stack>
          <Typography variant="caption" sx={{ color: 'text.disabled' }}>
            Customer can confirm via the portal or SMS — or confirm here for a customer standing in front of you.
          </Typography>
        </Stack>
      )}

      {/* In-person confirmation; the customer's own confirmation happens in the portal */}
      <Dialog
        open={dialogOpen}
        onClose={() => !confirmMutation.isPending && setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '20px',
            background: 'rgba(255,255,255,0.97)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.4)',
          },
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box sx={{ p: 1, borderRadius: '10px', bgcolor: alpha('#1e5c3a', 0.08), display: 'flex', alignItems: 'center' }}>
              <ShieldOutlinedIcon sx={{ fontSize: 20, color: '#1e5c3a' }} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                Confirm Fabric
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Records the customer's in-person confirmation and generates the Fabric Safety Seal
              </Typography>
            </Box>
          </Stack>
        </DialogTitle>
        <DialogContent dividers sx={{ pt: 2 }}>
          {hasQuantity ? (
            <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: alpha('#1e5c3a', 0.06) }}>
              <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Recorded Fabric Quantity
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 700 }}>
                {quantity} {quantityUnit}
              </Typography>
            </Box>
          ) : (
            <Alert severity="warning" sx={{ borderRadius: 2 }}>
              No fabric quantity was recorded for this garment at intake. Record one before confirming.
            </Alert>
          )}
          <Typography variant="caption" sx={{ color: 'text.disabled', mt: 1.5, display: 'block' }}>
            This cannot be undone — the fabric record locks permanently once confirmed.
          </Typography>
          {confirmMutation.isError && (
            <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
              Failed to confirm fabric. Please try again.
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            onClick={() => setDialogOpen(false)}
            disabled={confirmMutation.isPending}
            sx={{ fontWeight: 700, borderRadius: 2, textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={!hasQuantity || confirmMutation.isPending}
            onClick={() => confirmMutation.mutate()}
            sx={{ fontWeight: 700, borderRadius: 2, textTransform: 'none', bgcolor: '#1e5c3a', '&:hover': { bgcolor: '#256b45' } }}
          >
            {confirmMutation.isPending ? <CircularProgress size={16} sx={{ color: 'white' }} /> : 'Confirm Fabric'}
          </Button>
        </DialogActions>
      </Dialog>

      {seal && (
        <Stack spacing={2}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            alignItems={{ xs: 'flex-start', sm: 'center' }}
          >
            <Box
              component="img"
              src={seal.qrCodeDataUrl}
              alt={`QR code for seal ${seal.verificationCode}`}
              sx={{ width: 160, height: 160, display: 'block', flexShrink: 0 }}
            />
            <Stack spacing={0.75}>
              <Typography
                variant="caption"
                sx={{ fontWeight: 800, color: 'text.disabled', textTransform: 'uppercase', fontSize: '10px', letterSpacing: 1 }}
              >
                Verification Code
              </Typography>
              <Typography
                sx={{
                  fontFamily: 'monospace',
                  fontSize: '1.4rem',
                  fontWeight: 800,
                  color: '#1e5c3a',
                  letterSpacing: '0.05em',
                  lineHeight: 1.2,
                }}
              >
                {seal.verificationCode}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                Generated {new Date(seal.generatedAt).toLocaleDateString('en-NG', {
                  day: 'numeric', month: 'short', year: 'numeric',
                })}
              </Typography>
              <Button
                size="small"
                variant="outlined"
                startIcon={<SmsOutlinedIcon />}
                onClick={() => handleShare(seal.verificationCode)}
                sx={{
                  mt: 0.5,
                  borderRadius: 2,
                  fontWeight: 700,
                  fontSize: '11px',
                  textTransform: 'none',
                  alignSelf: 'flex-start',
                  borderColor: alpha('#1e5c3a', 0.4),
                  color: '#1e5c3a',
                  '&:hover': { borderColor: '#1e5c3a', bgcolor: alpha('#1e5c3a', 0.04) },
                }}
              >
                Share via SMS
              </Button>
            </Stack>
          </Stack>
        </Stack>
      )}
    </Box>
  );
}
