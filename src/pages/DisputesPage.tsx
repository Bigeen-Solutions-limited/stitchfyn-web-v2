import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Stack,
  Alert,
  AlertTitle,
  Chip,
  Card,
  Button,
  Skeleton,
  Pagination,
  Tabs,
  Tab,
  alpha,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Divider,
  InputAdornment,
  CircularProgress,
} from '@mui/material';
import {
  Gavel as GavelIcon,
  ArrowForward as ArrowForwardIcon,
  AcUnit as AcUnitIcon,
  CheckCircle as CheckCircleIcon,
  Block as BlockIcon,
  Add as AddIcon,
  CloudUpload as CloudUploadIcon,
  VerifiedUser as VerifiedUserIcon,
  HourglassBottom as HourglassBottomIcon,
  Handshake as HandshakeIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import {
  useDisputesList,
  useRaiseDispute,
  useSubmitEvidence,
  useResolveDispute,
  useTailorResolve,
  type DisputeListItem,
  type DisputeStatus,
} from '../features/dispute/dispute.hooks';
import type { RaiseDisputeDTO, SubmitEvidenceDTO, ResolveDisputeDTO } from '../features/dispute/dispute.api';
import { useAuthStore } from '../features/auth/auth.store';
import type { Capability } from '../features/auth/auth.types';

const ITEMS_PER_PAGE = 10;

type FilterTab = 'ALL' | 'ACTIVE' | 'RESOLVED';

const ACTIVE_STATUSES: DisputeStatus[] = ['OPEN', 'EVIDENCE_REQUIRED', 'UNDER_REVIEW'];
const RESOLVED_STATUSES: DisputeStatus[] = ['RESOLVED', 'TERMINATED'];

function getStatusConfig(status: DisputeStatus) {
  switch (status) {
    case 'OPEN':
      return { label: 'Open', color: '#d97706', bg: 'rgba(217, 119, 6, 0.1)', icon: <AcUnitIcon sx={{ fontSize: 12 }} /> };
    case 'EVIDENCE_REQUIRED':
      return { label: 'Evidence Required', color: '#ea580c', bg: 'rgba(234, 88, 12, 0.1)', icon: <AcUnitIcon sx={{ fontSize: 12 }} /> };
    case 'UNDER_REVIEW':
      return { label: 'Under Review', color: '#2563eb', bg: 'rgba(37, 99, 235, 0.1)', icon: <HourglassBottomIcon sx={{ fontSize: 12 }} /> };
    case 'RESOLVED':
      return { label: 'Resolved', color: '#16a34a', bg: 'rgba(22, 163, 74, 0.1)', icon: <CheckCircleIcon sx={{ fontSize: 12 }} /> };
    case 'TERMINATED':
      return { label: 'Terminated', color: '#6b7280', bg: 'rgba(107, 114, 128, 0.1)', icon: <BlockIcon sx={{ fontSize: 12 }} /> };
  }
}

function getCategoryColor(category: string) {
  switch (category) {
    case 'MATERIAL': return '#7c3aed';
    case 'MEASUREMENT': return '#0891b2';
    case 'FINANCIAL': return '#dc2626';
    case 'AESTHETIC': return '#d97706';
    default: return '#6b7280';
  }
}

function hasCapability(capabilities: Capability[], cap: Capability): boolean {
  return capabilities.includes(cap);
}

interface RaiseDisputeDialogProps {
  open: boolean;
  onClose: () => void;
}

const RaiseDisputeDialog: React.FC<RaiseDisputeDialogProps> = ({ open, onClose }) => {
  const raiseDispute = useRaiseDispute();
  const [form, setForm] = useState<Omit<RaiseDisputeDTO, 'initiator'>>({
    orderId: '',
    category: 'MATERIAL',
    severity: 'WARNING',
    description: '',
  });

  const handleChange = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const { user } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    await raiseDispute.mutateAsync({ 
      ...form, 
      initiator: {
        userId: user.id,
        role: user.role
      }
    });
    setForm({ orderId: '', category: 'MATERIAL', severity: 'WARNING', description: '' });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '24px', p: 1 } }}>
      <form onSubmit={handleSubmit}>
        <DialogTitle sx={{ fontWeight: 800 }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <GavelIcon sx={{ color: 'primary.main', fontSize: 22 }} />
            <span>Raise Dispute</span>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            <TextField
              label="Order ID"
              value={form.orderId}
              onChange={handleChange('orderId')}
              required
              fullWidth
              size="small"
              placeholder="Enter the affected order ID"
              InputProps={{ sx: { borderRadius: '12px' } }}
            />
            <Stack direction="row" spacing={2}>
              <TextField
                label="Category"
                value={form.category}
                onChange={handleChange('category')}
                select
                required
                fullWidth
                size="small"
                InputProps={{ sx: { borderRadius: '12px' } }}
              >
                {(['MATERIAL', 'MEASUREMENT', 'FINANCIAL', 'AESTHETIC'] as const).map((c) => (
                  <MenuItem key={c} value={c}>{c.charAt(0) + c.slice(1).toLowerCase()}</MenuItem>
                ))}
              </TextField>
              <TextField
                label="Severity"
                value={form.severity}
                onChange={handleChange('severity')}
                select
                required
                fullWidth
                size="small"
                InputProps={{ sx: { borderRadius: '12px' } }}
              >
                <MenuItem value="WARNING">Warning</MenuItem>
                <MenuItem value="CRITICAL">Critical</MenuItem>
              </TextField>
            </Stack>
            <TextField
              label="Description"
              value={form.description}
              onChange={handleChange('description')}
              required
              fullWidth
              multiline
              rows={4}
              size="small"
              placeholder="Describe the issue in detail — this becomes the immutable dispute record."
              InputProps={{ sx: { borderRadius: '12px' } }}
            />
            {form.severity === 'CRITICAL' && (
              <Alert severity="warning" sx={{ borderRadius: '12px', fontSize: '12px' }}>
                CRITICAL disputes immediately freeze production Trust Gates on the affected order.
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button onClick={onClose} sx={{ color: 'text.secondary', borderRadius: '10px' }}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={raiseDispute.isPending}
            sx={{ borderRadius: '10px', fontWeight: 700, px: 3 }}
          >
            {raiseDispute.isPending ? 'Sealing Record...' : 'Raise Dispute'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

interface EvidenceDialogProps {
  open: boolean;
  onClose: () => void;
  dispute: DisputeListItem;
}

const EvidenceSubmitDialog: React.FC<EvidenceDialogProps> = ({ open, onClose, dispute }) => {
  const submitEvidence = useSubmitEvidence(dispute.orderId);
  const [form, setForm] = useState<Pick<SubmitEvidenceDTO, 'evidenceType' | 'artifactUrl' | 'metadata'>>({
    evidenceType: 'PHOTO',
    artifactUrl: '',
    metadata: {},
  });
  const [metaNote, setMetaNote] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitEvidence.mutateAsync({
      disputeId: dispute.id,
      evidenceType: form.evidenceType,
      artifactUrl: form.artifactUrl,
      metadata: metaNote ? { note: metaNote } : {},
    });
    setForm({ evidenceType: 'PHOTO', artifactUrl: '', metadata: {} });
    setMetaNote('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '24px', p: 1 } }}>
      <form onSubmit={handleSubmit}>
        <DialogTitle sx={{ fontWeight: 800 }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <CloudUploadIcon sx={{ color: '#2563eb', fontSize: 22 }} />
            <span>Submit Evidence</span>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            <Box sx={{ p: 2, bgcolor: alpha('#2563eb', 0.05), borderRadius: '12px', border: '1px solid', borderColor: alpha('#2563eb', 0.2) }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#2563eb', display: 'block', mb: 0.5 }}>
                Dispute #{dispute.id.slice(-8).toUpperCase()}
              </Typography>
              <Typography variant="body2" sx={{ color: '#374151', fontWeight: 500 }}>
                {dispute.description.length > 80 ? dispute.description.slice(0, 80) + '...' : dispute.description}
              </Typography>
            </Box>
            <TextField
              label="Evidence Type"
              value={form.evidenceType}
              onChange={(e) => setForm((p) => ({ ...p, evidenceType: e.target.value as SubmitEvidenceDTO['evidenceType'] }))}
              select
              required
              fullWidth
              size="small"
              InputProps={{ sx: { borderRadius: '12px' } }}
            >
              <MenuItem value="PHOTO">Photo / Image</MenuItem>
              <MenuItem value="STATEMENT">Written Statement</MenuItem>
              <MenuItem value="PAYMENT_PROOF">Payment Proof</MenuItem>
            </TextField>
            <TextField
              label="Artifact URL"
              value={form.artifactUrl}
              onChange={(e) => setForm((p) => ({ ...p, artifactUrl: e.target.value }))}
              required
              fullWidth
              size="small"
              placeholder="https://cdn.example.com/evidence/..."
              InputProps={{
                sx: { borderRadius: '12px' },
                startAdornment: <InputAdornment position="start"><CloudUploadIcon sx={{ fontSize: 16, color: 'text.disabled' }} /></InputAdornment>,
              }}
            />
            <TextField
              label="Notes (optional)"
              value={metaNote}
              onChange={(e) => setMetaNote(e.target.value)}
              fullWidth
              multiline
              rows={2}
              size="small"
              placeholder="Context or description for this artifact"
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
            disabled={submitEvidence.isPending}
            sx={{ borderRadius: '10px', fontWeight: 700, px: 3, bgcolor: '#2563eb', '&:hover': { bgcolor: '#1d4ed8' } }}
          >
            {submitEvidence.isPending ? 'Submitting...' : 'Submit Evidence'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

interface ResolveDialogProps {
  open: boolean;
  onClose: () => void;
  dispute: DisputeListItem;
}

const ResolveDisputeDialog: React.FC<ResolveDialogProps> = ({ open, onClose, dispute }) => {
  const resolveDispute = useResolveDispute(dispute.orderId);
  const [form, setForm] = useState<Omit<ResolveDisputeDTO, 'disputeId'> & { outcome: string; settlementAmount: string; notes: string }>({
    resolutionToken: '',
    outcome: 'MUTUAL_AGREEMENT',
    settlementAmount: '',
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await resolveDispute.mutateAsync({
      disputeId: dispute.id,
      resolutionToken: form.resolutionToken,
    });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '24px', p: 1 } }}>
      <form onSubmit={handleSubmit}>
        <DialogTitle sx={{ fontWeight: 800 }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <VerifiedUserIcon sx={{ color: '#16a34a', fontSize: 22 }} />
            <span>Resolution Dashboard</span>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            <Box sx={{ p: 2, bgcolor: alpha('#16a34a', 0.05), borderRadius: '12px', border: '1px solid', borderColor: alpha('#16a34a', 0.2) }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#16a34a', display: 'block', mb: 0.5 }}>
                Order #{dispute.orderId.slice(-8).toUpperCase()} · {dispute.daysInStandoff}d in standoff
              </Typography>
              <Typography variant="body2" sx={{ color: '#374151', fontWeight: 500 }}>
                {dispute.description.length > 80 ? dispute.description.slice(0, 80) + '...' : dispute.description}
              </Typography>
            </Box>

            <Alert severity="info" sx={{ borderRadius: '12px', fontSize: '12px' }}>
              The Resolution Token is a multi-party consensus proof issued by the arbitration engine.
              Entering it here cryptographically couples the settlement to the sealed financial snapshot.
            </Alert>

            <TextField
              label="Resolution Token"
              value={form.resolutionToken}
              onChange={(e) => setForm((p) => ({ ...p, resolutionToken: e.target.value }))}
              required
              fullWidth
              size="small"
              placeholder="TOK-CONSENSUS-..."
              InputProps={{
                sx: { borderRadius: '12px', fontFamily: 'monospace' },
                startAdornment: <InputAdornment position="start"><VerifiedUserIcon sx={{ fontSize: 16, color: 'text.disabled' }} /></InputAdornment>,
              }}
            />
            <TextField
              label="Outcome"
              value={form.outcome}
              onChange={(e) => setForm((p) => ({ ...p, outcome: e.target.value }))}
              select
              required
              fullWidth
              size="small"
              InputProps={{ sx: { borderRadius: '12px' } }}
            >
              <MenuItem value="CUSTOMER_UPHELD">Customer Upheld</MenuItem>
              <MenuItem value="BUSINESS_UPHELD">Business Upheld</MenuItem>
              <MenuItem value="MUTUAL_AGREEMENT">Mutual Agreement</MenuItem>
            </TextField>
            <TextField
              label="Settlement Amount (pence, optional)"
              value={form.settlementAmount}
              onChange={(e) => setForm((p) => ({ ...p, settlementAmount: e.target.value }))}
              fullWidth
              size="small"
              type="number"
              placeholder="0"
              InputProps={{ sx: { borderRadius: '12px' }, startAdornment: <InputAdornment position="start">£</InputAdornment> }}
            />
            <TextField
              label="Resolution Notes"
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              required
              fullWidth
              multiline
              rows={3}
              size="small"
              placeholder="Rationale for this outcome — becomes part of the immutable forensic record."
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
            disabled={resolveDispute.isPending}
            sx={{ borderRadius: '10px', fontWeight: 700, px: 3, bgcolor: '#16a34a', '&:hover': { bgcolor: '#15803d' } }}
          >
            {resolveDispute.isPending ? 'Locking Settlement...' : 'Lock Resolution'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

interface DisputeCardProps {
  dispute: DisputeListItem;
  onViewOrder: (orderId: string) => void;
  canSubmitEvidence: boolean;
  canResolve: boolean;
  canConfirmResolution: boolean;
}

const DisputeCard: React.FC<DisputeCardProps> = ({ dispute, onViewOrder, canSubmitEvidence, canResolve, canConfirmResolution }) => {
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [resolveOpen, setResolveOpen] = useState(false);
  const tailorResolve = useTailorResolve(dispute.orderId);

  const statusConfig = getStatusConfig(dispute.status);
  const isActive = ACTIVE_STATUSES.includes(dispute.status);
  const categoryColor = getCategoryColor(dispute.category);
  const canSubmitNow = canSubmitEvidence && (dispute.status === 'OPEN' || dispute.status === 'EVIDENCE_REQUIRED' || dispute.status === 'UNDER_REVIEW');
  const canResolveNow = canResolve && dispute.status === 'UNDER_REVIEW';

  return (
    <>
      <Card
        className="sf-glass"
        sx={{
          p: 3,
          borderRadius: '20px',
          border: '1px solid',
          borderColor: isActive ? alpha('#d97706', 0.3) : 'rgba(255, 255, 255, 0.3)',
          bgcolor: isActive ? alpha('#fffbeb', 0.6) : 'rgba(255, 255, 255, 0.4)',
          backdropFilter: 'blur(10px)',
          boxShadow: isActive
            ? '0 4px 20px rgba(217, 119, 6, 0.08)'
            : '0 4px 20px rgba(0, 0, 0, 0.03)',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: isActive
              ? '0 8px 30px rgba(217, 119, 6, 0.12)'
              : '0 8px 30px rgba(0, 0, 0, 0.06)',
          },
        }}
      >
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {/* Top row: category + severity + status */}
            <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 1.5 }}>
              <Chip
                label={dispute.category}
                size="small"
                sx={{
                  height: 22,
                  fontSize: '10px',
                  fontWeight: 800,
                  bgcolor: alpha(categoryColor, 0.1),
                  color: categoryColor,
                  borderRadius: '6px',
                  letterSpacing: '0.05em',
                }}
              />
              <Chip
                label={dispute.severity}
                size="small"
                sx={{
                  height: 22,
                  fontSize: '10px',
                  fontWeight: 800,
                  bgcolor: dispute.severity === 'CRITICAL' ? alpha('#dc2626', 0.1) : alpha('#d97706', 0.1),
                  color: dispute.severity === 'CRITICAL' ? '#dc2626' : '#d97706',
                  borderRadius: '6px',
                  letterSpacing: '0.05em',
                }}
              />
              <Chip
                label={statusConfig?.label}
                size="small"
                icon={statusConfig?.icon}
                sx={{
                  height: 22,
                  fontSize: '10px',
                  fontWeight: 700,
                  bgcolor: statusConfig?.bg,
                  color: statusConfig?.color,
                  borderRadius: '6px',
                  '& .MuiChip-icon': { color: 'inherit', ml: '6px' },
                }}
              />
            </Stack>

            {dispute.referenceNumber && (
              <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 1.25 }}>
                <GavelIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                <Typography
                  variant="caption"
                  sx={{ fontFamily: 'monospace', fontSize: '1rem', fontWeight: 700, color: '#374151', letterSpacing: '0.02em' }}
                >
                  {dispute.referenceNumber}
                </Typography>
              </Stack>
            )}

            <Typography
              variant="body2"
              sx={{
                color: '#1a2340',
                fontWeight: 500,
                mb: 1.5,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {dispute.description}
            </Typography>

            {/* Whether each side has confirmed the resolution */}
            <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 1 }}>
              <Chip
                size="small"
                icon={dispute.tailorConfirmedResolvedAt
                  ? <CheckCircleIcon sx={{ fontSize: 12 }} />
                  : <HourglassBottomIcon sx={{ fontSize: 12 }} />}
                label={dispute.tailorConfirmedResolvedAt ? 'Tailor confirmed' : 'Tailor: pending'}
                sx={{
                  height: 22,
                  fontSize: '10px',
                  fontWeight: 700,
                  borderRadius: '6px',
                  bgcolor: dispute.tailorConfirmedResolvedAt ? alpha('#16a34a', 0.1) : alpha('#6b7280', 0.08),
                  color: dispute.tailorConfirmedResolvedAt ? '#16a34a' : '#6b7280',
                  '& .MuiChip-icon': { color: 'inherit', ml: '5px' },
                }}
              />
              <Chip
                size="small"
                icon={dispute.customerConfirmedResolvedAt
                  ? <CheckCircleIcon sx={{ fontSize: 12 }} />
                  : <HourglassBottomIcon sx={{ fontSize: 12 }} />}
                label={dispute.customerConfirmedResolvedAt ? 'Customer confirmed' : 'Customer: pending'}
                sx={{
                  height: 22,
                  fontSize: '10px',
                  fontWeight: 700,
                  borderRadius: '6px',
                  bgcolor: dispute.customerConfirmedResolvedAt ? alpha('#16a34a', 0.1) : alpha('#6b7280', 0.08),
                  color: dispute.customerConfirmedResolvedAt ? '#16a34a' : '#6b7280',
                  '& .MuiChip-icon': { color: 'inherit', ml: '5px' },
                }}
              />
            </Stack>

            {/* Meta row */}
            <Stack direction="row" spacing={2} flexWrap="wrap">
              <Typography variant="caption" sx={{ color: '#6b7280', fontWeight: 600 }}>
                Order{' '}
                <Box component="span" sx={{ color: '#1e5c3a', fontWeight: 800 }}>
                  #{dispute.orderId.slice(-8).toUpperCase()}
                </Box>
              </Typography>
              {isActive && (
                <Tooltip title="Days production has been frozen" placement="top">
                  <Typography variant="caption" sx={{ color: '#d97706', fontWeight: 700 }}>
                    {dispute.daysInStandoff === 0 ? 'Opened today' : `${dispute.daysInStandoff}d in standoff`}
                  </Typography>
                </Tooltip>
              )}
              <Typography variant="caption" sx={{ color: '#9ca3af', fontWeight: 500 }}>
                {new Date(dispute.createdAt).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </Typography>
            </Stack>
          </Box>

          {/* Actions */}
          <Stack
            direction={{ xs: 'row', sm: 'column' }}
            spacing={1}
            sx={{ flexShrink: 0, alignItems: { xs: 'flex-start', sm: 'flex-end' }, justifyContent: 'center' }}
          >
            <Button
              size="small"
              endIcon={<ArrowForwardIcon sx={{ fontSize: 14 }} />}
              onClick={() => onViewOrder(dispute.orderId)}
              sx={{
                color: '#1e5c3a',
                fontWeight: 700,
                fontSize: '12px',
                textTransform: 'none',
                borderRadius: '10px',
                px: 2,
                py: 0.8,
                bgcolor: alpha('#1e5c3a', 0.06),
                '&:hover': { bgcolor: alpha('#1e5c3a', 0.12) },
                whiteSpace: 'nowrap',
              }}
            >
              View Order
            </Button>

            {canSubmitNow && (
              <Button
                size="small"
                startIcon={<CloudUploadIcon sx={{ fontSize: 14 }} />}
                onClick={() => setEvidenceOpen(true)}
                sx={{
                  color: '#2563eb',
                  fontWeight: 700,
                  fontSize: '12px',
                  textTransform: 'none',
                  borderRadius: '10px',
                  px: 2,
                  py: 0.8,
                  bgcolor: alpha('#2563eb', 0.06),
                  '&:hover': { bgcolor: alpha('#2563eb', 0.12) },
                  whiteSpace: 'nowrap',
                }}
              >
                Evidence Package
              </Button>
            )}

            {canResolveNow && (
              <Button
                size="small"
                startIcon={<VerifiedUserIcon sx={{ fontSize: 14 }} />}
                onClick={() => setResolveOpen(true)}
                sx={{
                  color: '#16a34a',
                  fontWeight: 700,
                  fontSize: '12px',
                  textTransform: 'none',
                  borderRadius: '10px',
                  px: 2,
                  py: 0.8,
                  bgcolor: alpha('#16a34a', 0.06),
                  '&:hover': { bgcolor: alpha('#16a34a', 0.12) },
                  whiteSpace: 'nowrap',
                }}
              >
                Resolution Dashboard
              </Button>
            )}

            {/* The tailor's side of the two-sided resolution sign-off */}
            {canConfirmResolution &&
              (dispute.status === 'OPEN' || dispute.status === 'UNDER_REVIEW') &&
              !dispute.tailorConfirmedResolvedAt && (
                <Button
                  size="small"
                  startIcon={tailorResolve.isPending
                    ? <CircularProgress size={12} color="inherit" />
                    : <HandshakeIcon sx={{ fontSize: 14 }} />}
                  onClick={() => tailorResolve.mutate(dispute.id)}
                  disabled={tailorResolve.isPending}
                  sx={{
                    color: '#2563eb',
                    fontWeight: 700,
                    fontSize: '12px',
                    textTransform: 'none',
                    borderRadius: '10px',
                    px: 2,
                    py: 0.8,
                    bgcolor: alpha('#2563eb', 0.06),
                    '&:hover': { bgcolor: alpha('#2563eb', 0.12) },
                    whiteSpace: 'nowrap',
                  }}
                >
                  Confirm Resolution
                </Button>
              )}
          </Stack>
        </Stack>
      </Card>

      {evidenceOpen && (
        <EvidenceSubmitDialog
          open={evidenceOpen}
          onClose={() => setEvidenceOpen(false)}
          dispute={dispute}
        />
      )}
      {resolveOpen && (
        <ResolveDisputeDialog
          open={resolveOpen}
          onClose={() => setResolveOpen(false)}
          dispute={dispute}
        />
      )}
    </>
  );
};

const CustomerEvidencePortal: React.FC = () => {
  const { data, isLoading } = useDisputesList(1, 5);
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const canRaise = user?.capabilities ? hasCapability(user.capabilities, 'RAISE_DISPUTE') : false;

  const [raiseOpen, setRaiseOpen] = useState(false);
  const [evidenceOpen, setEvidenceOpen] = useState(false);

  const activeDispute = useMemo(
    () => data?.items.find((d) => ACTIVE_STATUSES.includes(d.status)) ?? null,
    [data?.items]
  );

  return (
    <Box className="container" sx={{ py: 4 }}>
      <header style={{ marginBottom: 32 }}>
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 0.5 }}>
          <GavelIcon sx={{ fontSize: 32, color: 'primary.main' }} />
          <Typography
            variant="h4"
            className="mobile-page-title"
            sx={{ fontSize: { xs: '1.25rem', md: '2.125rem' }, fontWeight: 800 }}
          >
            Dispute Portal
          </Typography>
        </Stack>
        <Typography variant="body1" sx={{ color: 'text.secondary', mt: 1 }}>
          Submit evidence for your active dispute or raise a new one if an order issue remains unresolved.
        </Typography>
      </header>

      {isLoading ? (
        <Stack spacing={2}>
          <Skeleton variant="rectangular" height={160} sx={{ borderRadius: '20px' }} />
          <Skeleton variant="rectangular" height={120} sx={{ borderRadius: '20px' }} />
        </Stack>
      ) : activeDispute ? (
        <>
          {/* Active dispute banner */}
          <Alert severity="warning" sx={{ mb: 3, borderRadius: '12px' }}>
            <AlertTitle sx={{ fontWeight: 700 }}>Active Dispute</AlertTitle>
            Your dispute on Order #{activeDispute.orderId.slice(-8).toUpperCase()} is currently{' '}
            <strong>{getStatusConfig(activeDispute.status)?.label}</strong>.
            {activeDispute.status === 'EVIDENCE_REQUIRED' && ' Please submit evidence to advance your case.'}
            {activeDispute.status === 'UNDER_REVIEW' && ' Our team is reviewing the submitted evidence.'}
          </Alert>

          {/* Active dispute card */}
          <Card
            className="sf-glass"
            sx={{
              p: 3,
              borderRadius: '20px',
              border: '1px solid',
              borderColor: alpha('#d97706', 0.3),
              bgcolor: alpha('#fffbeb', 0.6),
              backdropFilter: 'blur(10px)',
              mb: 3,
            }}
          >
            <Stack spacing={2}>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                <Chip
                  label={activeDispute.category}
                  size="small"
                  sx={{
                    height: 22, fontSize: '10px', fontWeight: 800,
                    bgcolor: alpha(getCategoryColor(activeDispute.category), 0.1),
                    color: getCategoryColor(activeDispute.category),
                    borderRadius: '6px',
                  }}
                />
                <Chip
                  label={activeDispute.severity}
                  size="small"
                  sx={{
                    height: 22, fontSize: '10px', fontWeight: 800,
                    bgcolor: activeDispute.severity === 'CRITICAL' ? alpha('#dc2626', 0.1) : alpha('#d97706', 0.1),
                    color: activeDispute.severity === 'CRITICAL' ? '#dc2626' : '#d97706',
                    borderRadius: '6px',
                  }}
                />
              </Stack>
              <Typography variant="body2" sx={{ color: '#374151', fontWeight: 500 }}>
                {activeDispute.description}
              </Typography>
              <Divider />

              {/* Evidence Upload section */}
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 800, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Evidence Upload
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5, mb: 2 }}>
                  Upload photos, written statements, or payment proofs to support your case. Each artifact is
                  cryptographically coupled to your dispute record.
                </Typography>
                <Stack direction="row" spacing={2}>
                  <Button
                    variant="contained"
                    startIcon={<CloudUploadIcon />}
                    onClick={() => setEvidenceOpen(true)}
                    disabled={activeDispute.status === 'UNDER_REVIEW' || activeDispute.status === 'RESOLVED'}
                    sx={{ borderRadius: '12px', fontWeight: 700, textTransform: 'none', bgcolor: '#2563eb', '&:hover': { bgcolor: '#1d4ed8' } }}
                  >
                    Upload Evidence
                  </Button>
                  <Button
                    variant="outlined"
                    endIcon={<ArrowForwardIcon />}
                    onClick={() => navigate(`/orders/${activeDispute.orderId}`)}
                    sx={{ borderRadius: '12px', fontWeight: 700, textTransform: 'none', borderColor: alpha('#1e5c3a', 0.3), color: '#1e5c3a' }}
                  >
                    View Order
                  </Button>
                </Stack>
              </Box>
            </Stack>
          </Card>

          {evidenceOpen && (
            <EvidenceSubmitDialog
              open={evidenceOpen}
              onClose={() => setEvidenceOpen(false)}
              dispute={activeDispute}
            />
          )}
        </>
      ) : (
        <Card
          className="sf-glass"
          sx={{
            p: 5,
            borderRadius: '32px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '30vh',
            border: '1px solid rgba(255, 255, 255, 0.4)',
            textAlign: 'center',
          }}
        >
          <GavelIcon sx={{ fontSize: 48, color: alpha('#1e5c3a', 0.2), mb: 2 }} />
          <Typography variant="body1" sx={{ fontWeight: 700, color: '#374151', mb: 1 }}>
            No active disputes
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3, maxWidth: 400 }}>
            Your orders are progressing under full Trust parameters.
            If you have an issue with an order, you can raise a formal dispute below.
          </Typography>
          {canRaise && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setRaiseOpen(true)}
              sx={{ borderRadius: '12px', fontWeight: 700, textTransform: 'none' }}
            >
              Raise Dispute
            </Button>
          )}
        </Card>
      )}

      {raiseOpen && (
        <RaiseDisputeDialog
          open={raiseOpen}
          onClose={() => setRaiseOpen(false)}
        />
      )}
    </Box>
  );
};

// Owners and managers manage disputes; customers see the evidence portal

export const DisputesPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const isCustomer = user?.role === 'CUSTOMER';
  if (isCustomer) return <CustomerEvidencePortal />;

  const canRaise = user?.capabilities ? hasCapability(user.capabilities, 'RAISE_DISPUTE') : false;
  const canResolve = user?.capabilities ? hasCapability(user.capabilities, 'RESOLVE_DISPUTE') : false;

  return <ManagementDisputeView canRaise={canRaise} canResolve={canResolve} onNavigate={navigate} />;
};

// A separate component so its hooks can run after the early return above
const ManagementDisputeView: React.FC<{
  canRaise: boolean;
  canResolve: boolean;
  onNavigate: ReturnType<typeof useNavigate>;
}> = ({ canRaise, canResolve, onNavigate }) => {
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');
  const [raiseOpen, setRaiseOpen] = useState(false);

  const { data, isLoading } = useDisputesList(page, ITEMS_PER_PAGE);

  const filteredItems = useMemo(() => {
    if (!data?.items) return [];
    if (activeTab === 'ACTIVE') return data.items.filter((d) => ACTIVE_STATUSES.includes(d.status));
    if (activeTab === 'RESOLVED') return data.items.filter((d) => RESOLVED_STATUSES.includes(d.status));
    return data.items;
  }, [data?.items, activeTab]);

  const activeCount = useMemo(
    () => data?.items.filter((d) => ACTIVE_STATUSES.includes(d.status)).length ?? 0,
    [data?.items]
  );

  const handleTabChange = (_: React.SyntheticEvent, value: FilterTab) => {
    setActiveTab(value);
    setPage(1);
  };

  return (
    <Box className="container" sx={{ py: 4 }}>
      <header style={{ marginBottom: 32 }}>
        <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
          <Stack direction="row" spacing={2} alignItems="center">
            <GavelIcon sx={{ fontSize: 32, color: 'primary.main' }} />
            <Typography
              variant="h4"
              className="mobile-page-title"
              sx={{ fontSize: { xs: '1.25rem', md: '2.125rem' }, fontWeight: 800 }}
            >
              Dispute Resolution Portal
            </Typography>
            {activeCount > 0 && (
              <Chip
                label={`${activeCount} active`}
                size="small"
                sx={{
                  height: 24,
                  fontSize: '11px',
                  fontWeight: 800,
                  bgcolor: alpha('#d97706', 0.12),
                  color: '#d97706',
                  borderRadius: '8px',
                }}
              />
            )}
          </Stack>
          {canRaise && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setRaiseOpen(true)}
              sx={{
                borderRadius: '12px',
                fontWeight: 700,
                textTransform: 'none',
                flexShrink: 0,
                display: { xs: 'none', sm: 'flex' },
              }}
            >
              Raise Dispute
            </Button>
          )}
        </Stack>
        <Typography variant="body1" sx={{ color: 'text.secondary', mt: 1 }}>
          Structured Arbitration Lifecycle. Manage production standoffs and track cryptographic resolution tokens.
        </Typography>
        {canRaise && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setRaiseOpen(true)}
            fullWidth
            sx={{ borderRadius: '12px', fontWeight: 700, textTransform: 'none', mt: 2, display: { xs: 'flex', sm: 'none' } }}
          >
            Raise Dispute
          </Button>
        )}
      </header>

      {activeCount > 0 && (
        <Alert severity="warning" sx={{ mb: 3, borderRadius: '12px' }}>
          <AlertTitle sx={{ fontWeight: 700 }}>Arbitration State Machine Active</AlertTitle>
          {activeCount} active {activeCount === 1 ? 'dispute' : 'disputes'} currently {activeCount === 1 ? 'suspends' : 'suspend'} production
          workflows via Trust Gates. Unlocking orders requires a verified Resolution Token.
        </Alert>
      )}

      {/* Filter Tabs */}
      <Tabs
        value={activeTab}
        onChange={handleTabChange}
        sx={{
          mb: 3,
          '& .MuiTabs-indicator': { bgcolor: 'primary.main', height: 3, borderRadius: '3px 3px 0 0' },
          '& .MuiTab-root': {
            textTransform: 'none',
            fontWeight: 700,
            fontSize: '13px',
            minHeight: 44,
            color: 'text.secondary',
            '&.Mui-selected': { color: 'primary.main' },
          },
        }}
      >
        <Tab label="All Disputes" value="ALL" />
        <Tab label="Active / Frozen" value="ACTIVE" />
        <Tab label="Resolved" value="RESOLVED" />
      </Tabs>

      {/* Dispute List */}
      {isLoading ? (
        <Stack spacing={2}>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} variant="rectangular" height={130} sx={{ borderRadius: '20px' }} />
          ))}
        </Stack>
      ) : filteredItems.length === 0 ? (
        <Card
          className="sf-glass"
          sx={{
            p: 6,
            borderRadius: '32px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '30vh',
            border: '1px solid rgba(255, 255, 255, 0.4)',
          }}
        >
          <GavelIcon sx={{ fontSize: 48, color: alpha('#1e5c3a', 0.2), mb: 2 }} />
          <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 600 }}>
            {activeTab === 'ALL'
              ? 'No disputes found. The workshop is operating under full Trust parameters.'
              : activeTab === 'ACTIVE'
              ? 'No active disputes. All workflows are unblocked.'
              : 'No resolved disputes on record yet.'}
          </Typography>
        </Card>
      ) : (
        <Stack spacing={2}>
          {filteredItems.map((dispute) => (
            <DisputeCard
              key={dispute.id}
              dispute={dispute}
              onViewOrder={(orderId) => onNavigate(`/orders/${orderId}`)}
              canSubmitEvidence={canRaise}
              canResolve={canResolve}
              canConfirmResolution={canResolve}
            />
          ))}
        </Stack>
      )}

      {!isLoading && data && data.totalPages > 1 && activeTab === 'ALL' && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Pagination
            count={data.totalPages}
            page={page}
            onChange={(_, value) => setPage(value)}
            color="primary"
            shape="rounded"
            sx={{ '& .MuiPaginationItem-root': { fontWeight: 700, borderRadius: '10px' } }}
          />
        </Box>
      )}

      {raiseOpen && (
        <RaiseDisputeDialog
          open={raiseOpen}
          onClose={() => setRaiseOpen(false)}
        />
      )}
    </Box>
  );
};
