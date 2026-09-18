import {
  Box,
  Typography,
  Stack,
  Button,
  Chip,
  CircularProgress,
  alpha,
} from '@mui/material';
import AssignmentTurnedInOutlinedIcon from '@mui/icons-material/AssignmentTurnedInOutlined';
import CheckBoxOutlineBlankOutlinedIcon from '@mui/icons-material/CheckBoxOutlineBlankOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import HourglassEmptyOutlinedIcon from '@mui/icons-material/HourglassEmptyOutlined';
import InventoryOutlinedIcon from '@mui/icons-material/InventoryOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collectionApi, type ChecklistItem } from '../collection.api';
import { useAuthStore } from '../../auth/auth.store';
import { useDomainError } from '../../../lib/errors';
import { useToastStore } from '../../../components/feedback/Toast';
import { keys } from '../../../query/keys';

interface Props {
  orderId: string;
  lockedAt?: string | null;
  canInitiate: boolean;
}

function ItemList({ items }: { items: ChecklistItem[] }) {
  return (
    <Stack spacing={1} sx={{ mb: 2 }}>
      {items.map((item, idx) => (
        <Stack key={idx} direction="row" spacing={1.5} alignItems="center">
          <CheckBoxOutlineBlankOutlinedIcon sx={{ fontSize: 18, color: 'text.disabled', flexShrink: 0 }} />
          <Typography variant="body2" sx={{ fontWeight: 500 }}>{item.label}</Typography>
        </Stack>
      ))}
    </Stack>
  );
}

export function CollectionChecklistPanel({ orderId, lockedAt, canInitiate }: Props) {
  const queryClient = useQueryClient();
  const queryKey = keys.collection.checklist(orderId);
  const readinessKey = keys.collection.readiness(orderId);
  const currentUser = useAuthStore((s) => s.user);
  const showToast = useToastStore((s) => s.showToast);
  const { handleError } = useDomainError();

  const { data: checklist, isLoading, error } = useQuery({
    queryKey,
    queryFn: () => collectionApi.getChecklist(orderId),
    retry: (failureCount, err: any) => {
      if (err?.response?.status === 404) return false;
      return failureCount < 2;
    },
  });

  // US-4.8's own backend-authoritative readiness signal — a UX gate only.
  // The tailor-signoff endpoint enforces the same condition independently;
  // this query exists so the button can reflect that truthfully instead
  // of relying on the pre-existing, structurally-unreachable
  // garments.status check (see STITCHFYN_US4_8_FINAL_QUALITY_REVIEW_DISCOVERY.md §7).
  const { data: readiness } = useQuery({
    queryKey: readinessKey,
    queryFn: () => collectionApi.getReadiness(orderId),
    enabled: !!orderId,
  });
  const isReady = !!readiness?.ready;

  const is404 = (error as any)?.response?.status === 404;

  const createMutation = useMutation({
    mutationFn: () => collectionApi.createChecklist(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      showToast('Collection Review Started', 'The final quality review checklist is ready.');
    },
    onError: (err) => handleError(err),
  });

  const signoffMutation = useMutation({
    mutationFn: () => collectionApi.tailorSignoff(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: readinessKey });
      queryClient.invalidateQueries({ queryKey: ['orders', orderId] });
      showToast('Quality Check Complete', 'The final quality review has been recorded.');
    },
    onError: (err) => handleError(err),
  });

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
        <CircularProgress size={20} />
      </Box>
    );
  }

  return (
    <Box>
      <Typography
        variant="caption"
        sx={{ fontWeight: 800, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: 1, mb: 2, display: 'block' }}
      >
        Final Quality Review
      </Typography>

      {/* Lock banner — always shown when order is permanently archived */}
      {lockedAt && (
        <Stack
          direction="row"
          spacing={1.5}
          alignItems="center"
          sx={{
            mb: 2,
            p: 1.5,
            borderRadius: 2,
            bgcolor: alpha('#616161', 0.06),
            border: '1px solid',
            borderColor: alpha('#616161', 0.2),
          }}
        >
          <LockOutlinedIcon sx={{ fontSize: 16, color: 'text.secondary', flexShrink: 0 }} />
          <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.secondary' }}>
            Permanently archived on{' '}
            {new Date(lockedAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
          </Typography>
        </Stack>
      )}

      {/* State A — checklist does not exist */}
      {(is404 || (!checklist && !isLoading)) && (
        <>
          {isReady && canInitiate && !lockedAt && (
            <Button
              variant="outlined"
              size="small"
              startIcon={
                createMutation.isPending
                  ? <CircularProgress size={14} color="inherit" />
                  : <AssignmentTurnedInOutlinedIcon />
              }
              disabled={createMutation.isPending}
              onClick={() => createMutation.mutate()}
              sx={{
                borderRadius: 2,
                fontWeight: 700,
                fontSize: '12px',
                textTransform: 'none',
                borderColor: alpha('#1e5c3a', 0.4),
                color: '#1e5c3a',
                '&:hover': { borderColor: '#1e5c3a', bgcolor: alpha('#1e5c3a', 0.04) },
              }}
            >
              Begin Collection
            </Button>
          )}
          {!isReady && (
            <Typography variant="body2" sx={{ color: 'text.disabled', fontStyle: 'italic' }}>
              Available once every garment has finished production
            </Typography>
          )}
        </>
      )}

      {/* States B, C, D — checklist exists */}
      {checklist && (
        <Stack spacing={2}>
          <ItemList items={checklist.items} />

          {/* State B — tailor's final quality review not yet completed.
              canInitiate mirrors the same OWNER/MANAGER/TAILOR set that
              holds Capability.UPDATE_PRODUCTION server-side — the backend
              (not this check) is the actual authority. Disabled rather
              than hidden when not ready, matching the disabled+hint
              pattern already established for the QC/Collection Review
              Photo Gate. */}
          {!checklist.tailorSignoffAt && !lockedAt && canInitiate && (
            <Stack spacing={1} alignItems="flex-start">
              <Button
                variant="contained"
                size="small"
                startIcon={
                  signoffMutation.isPending
                    ? <CircularProgress size={14} color="inherit" />
                    : <CheckCircleOutlinedIcon />
                }
                disabled={signoffMutation.isPending || !isReady}
                onClick={() => signoffMutation.mutate()}
                sx={{
                  borderRadius: 2,
                  fontWeight: 700,
                  fontSize: '12px',
                  textTransform: 'none',
                  bgcolor: '#1e5c3a',
                  '&:hover': { bgcolor: '#174d30' },
                  alignSelf: 'flex-start',
                }}
              >
                {signoffMutation.isPending ? 'Completing…' : 'Complete Quality Check'}
              </Button>
              {!isReady && (
                <Typography variant="caption" sx={{ color: 'text.disabled', fontStyle: 'italic' }}>
                  Every garment on this order must finish production before the review can be completed.
                </Typography>
              )}
            </Stack>
          )}

          {/* State C — tailor's review complete, customer pending */}
          {checklist.tailorSignoffAt && !checklist.customerSignoffAt && (
            <Stack spacing={1.5}>
              <Stack direction="row" spacing={1} alignItems="center">
                <CheckCircleOutlinedIcon sx={{ fontSize: 18, color: '#1e5c3a' }} />
                <Typography variant="body2" sx={{ fontWeight: 700, color: '#1e5c3a' }}>
                  You completed the final quality review on{' '}
                  {new Date(checklist.tailorSignoffAt).toLocaleDateString('en-NG', {
                    day: 'numeric', month: 'short', year: 'numeric',
                  })}
                </Typography>
              </Stack>
              <Stack direction="row" spacing={1} alignItems="center">
                <HourglassEmptyOutlinedIcon sx={{ fontSize: 16, color: '#a06a00' }} />
                <Chip
                  label="Awaiting customer confirmation"
                  size="small"
                  sx={{
                    height: 22,
                    fontSize: '11px',
                    fontWeight: 700,
                    bgcolor: alpha('#f5a623', 0.12),
                    color: '#a06a00',
                    borderRadius: '6px',
                    border: '1px solid',
                    borderColor: alpha('#f5a623', 0.35),
                  }}
                />
              </Stack>
              <Typography variant="caption" sx={{ color: 'text.disabled', fontStyle: 'italic' }}>
                The customer will receive a link to confirm collection via their portal
              </Typography>
            </Stack>
          )}

          {/* State D — both signed off */}
          {checklist.tailorSignoffAt && checklist.customerSignoffAt && (
            <Stack spacing={1.5}>
              <Stack direction="row" spacing={1} alignItems="center">
                <CheckCircleOutlinedIcon sx={{ fontSize: 18, color: '#1e5c3a' }} />
                <Typography variant="body2" sx={{ fontWeight: 700, color: '#1e5c3a' }}>
                  Final quality review completed
                  {checklist.tailorSignoffBy && (
                    <> by {checklist.tailorSignoffBy === currentUser?.id ? currentUser?.fullName : checklist.tailorSignoffBy}</>
                  )}
                  {' '}on{' '}
                  {new Date(checklist.tailorSignoffAt).toLocaleDateString('en-NG', {
                    day: 'numeric', month: 'short', year: 'numeric',
                  })}
                </Typography>
              </Stack>
              <Stack direction="row" spacing={1} alignItems="center">
                <CheckCircleOutlinedIcon sx={{ fontSize: 18, color: '#1e5c3a' }} />
                <Typography variant="body2" sx={{ fontWeight: 700, color: '#1e5c3a' }}>
                  Customer confirmed on{' '}
                  {new Date(checklist.customerSignoffAt).toLocaleDateString('en-NG', {
                    day: 'numeric', month: 'short', year: 'numeric',
                  })}
                </Typography>
              </Stack>
              <Stack direction="row" spacing={1} alignItems="center">
                <InventoryOutlinedIcon sx={{ fontSize: 16, color: '#1e5c3a' }} />
                <Chip
                  label="Collected"
                  size="small"
                  sx={{
                    height: 22,
                    fontSize: '11px',
                    fontWeight: 700,
                    bgcolor: alpha('#1e5c3a', 0.1),
                    color: '#1e5c3a',
                    borderRadius: '6px',
                    border: '1px solid',
                    borderColor: alpha('#1e5c3a', 0.3),
                  }}
                />
              </Stack>
              <Box
                sx={{
                  p: 1.5,
                  bgcolor: alpha('#f5a623', 0.08),
                  border: '1px solid',
                  borderColor: alpha('#f5a623', 0.3),
                  borderRadius: 2,
                }}
              >
                <Typography variant="caption" sx={{ color: '#8a5e00', fontWeight: 600 }}>
                  This order will be permanently archived{' '}
                  {new Date(
                    new Date(checklist.customerSignoffAt).getTime() + 48 * 60 * 60 * 1000,
                  ).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                </Typography>
              </Box>
            </Stack>
          )}
        </Stack>
      )}
    </Box>
  );
}
