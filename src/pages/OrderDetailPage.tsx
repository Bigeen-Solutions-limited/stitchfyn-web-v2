import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useOrderDetail, useOrderGarments } from '../features/orders/hooks/useOrderDetail.ts';
import { useStaffList } from '../features/auth/hooks/useStaff.ts';
import { ordersApi } from '../features/orders/orders.api.ts';
import { useAuthStore } from '../features/auth/auth.store.ts';
import { useToastStore } from '../components/feedback/Toast.tsx';
import { WorkflowGraph } from '../features/workflow/components/WorkflowGraph.tsx';
import { WorkflowStageTimeline } from '../features/workflow/components/WorkflowStageTimeline.tsx';
import { MeasurementHistory } from '../features/measurements/components/MeasurementHistory.tsx';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Card,
  Typography,
  Button,
  Avatar,
  Stack,
  Box,
  Chip,
  Tabs,
  Tab,
  alpha,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  TextField,
  Snackbar,
  Alert,
  CircularProgress,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SettingsIcon from '@mui/icons-material/Settings';
import TimelineIcon from '@mui/icons-material/Timeline';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import ContentCutOutlinedIcon from '@mui/icons-material/ContentCutOutlined';
import DesignServicesOutlinedIcon from '@mui/icons-material/DesignServicesOutlined';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import { RiskBadge } from '../components/ui/RiskBadge.tsx';
import { useAvailableTransitions, useAttemptTransition } from '../features/production/hooks/useProductionMutation.ts';
import { canAcknowledgeDeposit, waitingFor } from '../lib/activation';
import { OrderMessageThread } from '../features/orders/components/OrderMessageThread';
import { EditOrderModal } from '../features/orders/components/EditOrderModal.tsx';
import { ReassignFabricDialog } from '../features/orders/components/ReassignFabricDialog.tsx';
import { AuditTrailTimeline } from '../features/audit/components/AuditTrailTimeline.tsx';
import { DisputePortal } from '../features/dispute/components/DisputePortal.tsx';

import { truncateId } from '../utils/format.ts';
import { PaymentPanel } from '../features/orders/components/PaymentPanel.tsx';
import { DesignBriefPanel } from '../features/orders/components/DesignBriefPanel.tsx';
import { FabricSealPanel } from '../features/orders/components/FabricSealPanel.tsx';
import { CustomerLinkPanel } from '../features/orders/components/CustomerLinkPanel.tsx';
import { FabricEvidenceCapturePanel } from '../features/orders/components/FabricEvidenceCapturePanel.tsx';
import { CollectionChecklistPanel } from '../features/orders/components/CollectionChecklistPanel.tsx';
import { FittingsPanel } from '../features/orders/components/FittingsPanel.tsx';
import { MobileHeader } from '../components/layout/MobileHeader.tsx';

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const showToast = useToastStore((state) => state.showToast);
  const user = useAuthStore((state) => state.user);
  const isCompanyAdminOrManager = user?.role === 'OWNER' || user?.role === 'MANAGER';
  const { data: detail, isLoading, isError } = useOrderDetail(id!);
  const { data: garments, isLoading: isLoadingGarments, refetch: refetchGarments } = useOrderGarments(id!);
  const { data: staff } = useStaffList({ 
    storeId: detail?.order.storeId,
    enabled: isCompanyAdminOrManager && !!detail?.order.storeId
  });
  const [selectedGarmentId, setSelectedGarmentId] = useState<string | null>(null);
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [reassignOpen, setReassignOpen] = useState(false);
  const [workflowTab, setWorkflowTab] = useState<'graph' | 'timeline'>('graph');
  const [showForensicProof, setShowForensicProof] = useState(false);
  const [bypassModal, setBypassModal] = useState<{ open: boolean; targetStatus: string } | null>(null);
  const [bypassReason, setBypassReason] = useState('');
  const [pdfExporting, setPdfExporting] = useState(false);
  const [pdfSnackbar, setPdfSnackbar] = useState<{ open: boolean; severity: 'error' | 'warning'; message: string } | null>(null);

  const tailors = staff?.filter(s => s.role === 'TAILOR') || [];
  const { data: availableTransitions = [] } = useAvailableTransitions(selectedGarmentId ?? '');
  const attemptTransition = useAttemptTransition();

  useEffect(() => {
    if (garments && garments.length > 0 && (!selectedGarmentId || !garments.some(g => g.id === selectedGarmentId))) {
      const targetId = (location.state as any)?.targetGarmentId;
      const isValidTarget = targetId && garments?.some(g => g.id === targetId);

      if (isValidTarget) {
        setSelectedGarmentId(targetId);
      } else {
        setSelectedGarmentId(garments[0].id);
      }
    }
  }, [garments, selectedGarmentId, location.state]);

  if (isLoading || isLoadingGarments) return <div className="sf-loading-overlay sf-glass">Syncing Production Context...</div>;
  if (isError || !detail) return <div className="container p-lg text-center"><h1>Order Not Found</h1><p>This production record does not exist or access is restricted.</p></div>;

  const { order, projection } = detail;
  const selectedGarment = garments?.find(g => g.id === selectedGarmentId);
  const isOrderCompleted = garments && garments.length > 0 && garments.every((g: any) => g.status === 'COMPLETED');
  const isOrderLocked = !!order.lockedAt;

  const handleAssignTailor = async (tailorId: string) => {
    if (!selectedGarmentId) return;
    try {
      await ordersApi.assignTailor(selectedGarmentId, tailorId || null);
      showToast("Assignment updated successfully", "success");
      refetchGarments();
    } catch (err) {
      showToast("Failed to update assignment", "error");
    }
  };

  const handleExportEvidence = async () => {
    if (!order.id) return;
    setPdfExporting(true);
    try {
      const blob = await ordersApi.exportEvidencePdf(order.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `evidence-${order.id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      if (err?.response?.status === 409) {
        const text = await err.response.data?.text?.() ?? 'Confirm fabric intake before exporting evidence';
        setPdfSnackbar({ open: true, severity: 'warning', message: text });
      } else {
        setPdfSnackbar({ open: true, severity: 'error', message: 'Failed to export evidence PDF. Please try again.' });
      }
    } finally {
      setPdfExporting(false);
    }
  };

  const riskBadgeClass =
    projection.riskLevel === 'ON_TRACK' ? 'badge-ontrack' :
    projection.riskLevel === 'AT_RISK' ? 'badge-atrisk' : 'badge-overdue';

  return (
    <Box className="order-detail-page" sx={{ p: { xs: 2, md: 4 }, maxWidth: 1400, mx: 'auto' }}>
      <MobileHeader 
        title={`#${truncateId(order.id).toUpperCase()}`} 
        subtitle={`Event: ${new Date(order.eventDate).toLocaleDateString()}`}
      />

      {/* Header, desktop only */}
      <Card 
        elevation={0} 
        className="sf-glass" 
        sx={{ 
          p: 3, 
          mb: 4, 
          borderRadius: 3, 
          border: '1px solid', 
          borderColor: 'divider',
          display: { xs: 'none', md: 'block' },
          '& .MuiButton-root': { whiteSpace: 'nowrap' },
        }}
      >
        {/* Wraps onto a second row on narrower desktops instead of squeezing the buttons */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" useFlexGap sx={{ gap: 2 }}>
          <Stack direction="row" spacing={3} alignItems="center">
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate('/orders')}
              sx={{ borderRadius: 3, px: 2, fontWeight: 700 }}
            >
              Back to Ledger
            </Button>
            <Box>
              <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, display: 'block', lineHeight: 1.2 }}>
                Production Record
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800 }}>
                #{truncateId(order.id).toUpperCase()}
              </Typography>
            </Box>
            <Box sx={{ borderLeft: '1px solid', borderColor: 'divider', pl: 3 }}>
              <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, display: 'block', lineHeight: 1.2 }}>
                Event Date
              </Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {new Date(order.eventDate).toLocaleDateString()}
              </Typography>
            </Box>
          </Stack>
          <Stack alignItems="flex-end" spacing={1}>
            <Stack direction="row" spacing={2} alignItems="center">
              {isCompanyAdminOrManager && (() => {
                const fabricBlocked = order.unverifiedFlags?.includes('fabric') ?? false;
                return (
                  <Tooltip title={fabricBlocked ? 'Confirm fabric intake before exporting' : ''} arrow>
                    <span>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={pdfExporting ? <CircularProgress size={14} color="inherit" /> : <PictureAsPdfOutlinedIcon />}
                        onClick={handleExportEvidence}
                        disabled={fabricBlocked || pdfExporting}
                        sx={{
                          borderRadius: 2,
                          fontWeight: 700,
                          fontSize: '12px',
                          textTransform: 'none',
                        }}
                      >
                        Export Evidence
                      </Button>
                    </span>
                  </Tooltip>
                );
              })()}
              {isCompanyAdminOrManager && (
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<FingerprintIcon />}
                  onClick={() => setShowForensicProof(true)}
                  sx={{
                    borderRadius: 2,
                    borderColor: alpha('#1e5c3a', 0.4),
                    color: '#1e5c3a',
                    fontWeight: 700,
                    '&:hover': { borderColor: '#1e5c3a', bgcolor: alpha('#1e5c3a', 0.04) },
                  }}
                >
                  Forensic Proof
                </Button>
              )}
              {!isOrderCompleted && !isOrderLocked && isCompanyAdminOrManager && (
                <Button
                  size="small"
                  variant="outlined"
                  color="inherit"
                  startIcon={<SettingsIcon />}
                  onClick={() => setEditModalOpen(true)}
                  sx={{ borderRadius: 2 }}
                >
                  Edit Order
                </Button>
              )}
              <div className={`badge ${riskBadgeClass} py-2 px-4 text-sm font-bold shadow-sm`} style={{ borderRadius: '8px' }}>
                {projection.riskLevel.replace('_', ' ')}
              </div>
            </Stack>
            <Typography variant="caption" color="text.secondary">
              Last projection: {new Date(projection.calculatedAt).toLocaleTimeString()}
            </Typography>
          </Stack>
        </Stack>
      </Card>

      <DisputePortal orderId={order.id} />

      {/* Mobile Risk Indicator */}
      <Box sx={{ mb: 3, display: { xs: 'flex', md: 'none' }, justifyContent: 'space-between', alignItems: 'center' }}>
        <div className={`badge ${riskBadgeClass} py-1 px-3 text-xs font-bold shadow-sm`} style={{ borderRadius: '6px' }}>
          {projection.riskLevel.replace('_', ' ')}
        </div>
        {!isOrderCompleted && !isOrderLocked && isCompanyAdminOrManager && (
          <Button
            size="small"
            variant="text"
            startIcon={<SettingsIcon />}
            onClick={() => setEditModalOpen(true)}
          >
            Edit
          </Button>
        )}
      </Box>

      <Grid container spacing={4}>
        {/* Left column */}
        <Grid size={{xs: 12, md: 4}}>
          <Stack spacing={3}>
            {/* Client details */}
            <Card className="sf-card" sx={{ p: 3, borderRadius: 3 }}>
              <Typography variant="h6" fontWeight={800} sx={{ mb: 2 }}>Client Perimeter</Typography>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>Customer Name</Typography>
                  <Typography variant="body1" fontWeight={700}>{order.customerName}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>Wedding/Event Date</Typography>
                  <Typography variant="body1" fontWeight={700}>{new Date(order.eventDate).toLocaleDateString()}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>Volume</Typography>
                  <Typography variant="body1" fontWeight={700}>Total Garments: {garments?.length || 0}</Typography>
                </Box>
              </Stack>
            </Card>

            {/* Payments: owners and managers only */}
            {isCompanyAdminOrManager && (
              <PaymentPanel orderId={order.id} />
            )}

            {/* Garment picker */}
            <Card className="sf-card" sx={{ p: 3, borderRadius: 3 }}>
              <Typography variant="h6" fontWeight={800} sx={{ mb: 2 }}>Garment Inventory</Typography>
              <Stack spacing={1} sx={{ mb: 3 }}>
                {garments?.map((garment, index) => (
                  <Button
                    key={`${garment.id}-${index}`}
                    fullWidth
                    onClick={() => setSelectedGarmentId(garment.id)}
                    sx={{
                      justifyContent: 'space-between',
                      p: 2,
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: selectedGarmentId === garment.id ? 'primary.main' : 'divider',
                      bgcolor: selectedGarmentId === garment.id ? 'rgba(30, 92, 58, 0.05)' : 'transparent',
                      color: 'text.primary',
                      transition: 'all 0.2s',
                      textAlign: 'left',
                      '&:hover': {
                        bgcolor: 'rgba(30, 92, 58, 0.08)',
                        borderColor: 'primary.main'
                      },
                      borderLeft: selectedGarmentId === garment.id ? '6px solid' : '1px solid',
                      borderLeftColor: selectedGarmentId === garment.id ? 'primary.main' : 'divider'
                    }}
                  >
                    <Box sx={{ textAlign: 'left' }}>
                      <Typography variant="body2" sx={{ fontWeight: selectedGarmentId === garment.id ? 800 : 500 }}>
                        {garment.name}
                      </Typography>
                      {garment.assignedTailorId && (
                        <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 700, display: 'block', mt: 0.5 }}>
                          Tailor: {(() => {
                            const tailor = staff?.find(s => s.id === garment.assignedTailorId);
                            return tailor?.fullName || tailor?.email.split('@')[0] || 'Assigned';
                          })()}
                        </Typography>
                      )}
                    </Box>
                    <RiskBadge level={garment.status === 'COMPLETED' ? 'ON_TRACK' : projection.riskLevel} />
                  </Button>
                ))}
              </Stack>

              {selectedGarment && isCompanyAdminOrManager && !isOrderLocked && (
                <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={800} sx={{ textTransform: 'uppercase', mb: 1.5, display: 'block' }}>
                    Production Assignment
                  </Typography>
                  <FormControl fullWidth size="small">
                    <InputLabel id="assign-tailor-label">Assign Tailor</InputLabel>
                    <Select
                      labelId="assign-tailor-label"
                      // Empty until the staff list loads, so the select never holds a value it has no option for
                      value={tailors.some(t => t.id === selectedGarment.assignedTailorId) ? selectedGarment.assignedTailorId : ''}
                      label="Assign Tailor"
                      onChange={(e) => handleAssignTailor(e.target.value as string)}
                      sx={{ borderRadius: 2 }}
                    >
                      <MenuItem value=""><em>Unassigned</em></MenuItem>
                      {tailors.map(t => (
                        <MenuItem key={t.id} value={t.id}>
                          {t.fullName || t.email}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => setReassignOpen(true)}
                    sx={{ mt: 1.5, borderRadius: 2, fontWeight: 700 }}
                  >
                    Reassign
                  </Button>
                </Box>
              )}
              {selectedGarment && isCompanyAdminOrManager && !isOrderLocked && availableTransitions.length > 0 && (() => {
                const flags = order.unverifiedFlags ?? [];
                const isBlocked = flags.length > 0;
                const canAcknowledge = canAcknowledgeDeposit(flags, user?.role);

                const FLAG_META: Record<string, { icon: React.ReactElement; label: string }> = {
                  payment: { icon: <PaymentsOutlinedIcon sx={{ fontSize: 14 }} />, label: 'Deposit required' },
                  fabric:  { icon: <ContentCutOutlinedIcon sx={{ fontSize: 14 }} />, label: 'Fabric unconfirmed' },
                  design:  { icon: <DesignServicesOutlinedIcon sx={{ fontSize: 14 }} />, label: 'Design pending' },
                };

                return (
                  <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={800} sx={{ textTransform: 'uppercase', mb: 1.5, display: 'block' }}>
                      Status Transitions
                    </Typography>

                    {isBlocked && (
                      <Stack direction="row" spacing={0.5} sx={{ mb: 1.5, flexWrap: 'wrap', gap: 0.5 }}>
                        {flags.map(f => (
                          <Chip
                            key={f}
                            icon={FLAG_META[f]?.icon}
                            label={FLAG_META[f]?.label ?? f}
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: '9px',
                              fontWeight: 800,
                              borderRadius: '4px',
                              bgcolor: 'rgba(196, 154, 26, 0.1)',
                              color: '#8a6d1a',
                              border: '1px solid rgba(196, 154, 26, 0.25)',
                              '& .MuiChip-icon': { color: '#8a6d1a', marginLeft: '4px' },
                              '& .MuiChip-label': { px: 0.75 },
                            }}
                          />
                        ))}
                      </Stack>
                    )}

                    <Stack spacing={1}>
                      {availableTransitions.map((status: string) => {
                        // Cancelling is never gated; everything else waits for activation.
                        const gated = isBlocked && status !== 'CANCELLED';
                        const buttonDisabled = attemptTransition.isPending || (gated && !canAcknowledge);
                        const showOwnerBypass = gated && canAcknowledge;

                        const btn = (
                          <Button
                            key={status}
                            fullWidth
                            size="small"
                            variant="outlined"
                            disabled={buttonDisabled}
                            onClick={() => {
                              if (showOwnerBypass) {
                                setBypassReason('');
                                setBypassModal({ open: true, targetStatus: status });
                              } else {
                                attemptTransition.mutate({ garmentId: selectedGarment.id, targetStatus: status });
                              }
                            }}
                            sx={{
                              borderRadius: 2,
                              fontWeight: 700,
                              fontSize: '11px',
                              textTransform: 'none',
                              borderColor: gated && !canAcknowledge ? alpha('#9e9e9e', 0.4) : alpha('#1e5c3a', 0.3),
                              color: gated && !canAcknowledge ? 'text.disabled' : '#1e5c3a',
                              '&:hover': { borderColor: '#1e5c3a', bgcolor: alpha('#1e5c3a', 0.04) },
                              '&.Mui-disabled': { borderColor: alpha('#9e9e9e', 0.3), color: 'text.disabled' },
                            }}
                          >
                            → {status.replace(/_/g, ' ')}
                          </Button>
                        );

                        if (gated && !canAcknowledge) {
                          return (
                            <Tooltip
                              key={status}
                              title={waitingFor(flags)}
                              placement="top"
                            >
                              {/* A disabled button can't show a tooltip, so wrap it */}
                              <span style={{ display: 'block' }}>{btn}</span>
                            </Tooltip>
                          );
                        }
                        return btn;
                      })}
                    </Stack>
                  </Box>
                );
              })()}
            </Card>

            <Card className="sf-card" sx={{ p: 3, borderRadius: 3 }}>
              <Typography variant="h6" fontWeight={800} sx={{ mb: 2 }}>Quick Actions</Typography>
              <Stack spacing={2}>
                {/* Measurement versions are recorded on the client profile, which keeps every measurement point */}
                <Typography variant="body2" color="text.secondary">
                  Need to change measurements? Record a new version on the client's profile.
                </Typography>
                <Button variant="outlined" onClick={() => navigate(`/customers/${order.customerId}`)} sx={{ borderRadius: '12px', fontWeight: 700 }}>
                  Open client profile
                </Button>
              </Stack>
            </Card>
          </Stack>
        </Grid>

        {/* Main column */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Stack spacing={3}>
            {/* Selected garment */}
            <Card className="sf-card" sx={{ p: 4, borderRadius: 3 }}>
              {selectedGarment ? (
                <Stack spacing={4}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Box>
                      <Typography variant="h5" fontWeight={800}>{selectedGarment.name}</Typography>
                      <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                        <Chip
                          label={selectedGarment.status}
                          size="small"
                          sx={{ fontWeight: 700, borderRadius: 1.5, textTransform: 'uppercase' }}
                        />
                        <RiskBadge level={selectedGarment.status === 'COMPLETED' ? 'ON_TRACK' : projection.riskLevel} />
                      </Stack>
                    </Box>
                  </Stack>

                  <Grid container spacing={4}>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <Typography variant="caption" color="text.secondary" fontWeight={800} sx={{ textTransform: 'uppercase', mb: 1, display: 'block' }}>
                        Fabric Reference
                      </Typography>
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Avatar
                          variant="rounded"
                          src={selectedGarment.fabricImageBase64 || undefined}
                          sx={{
                            width: 80,
                            height: 80,
                            borderRadius: 2,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                            bgcolor: 'primary.light',
                            border: '1px solid',
                            borderColor: 'divider',
                            '& img': { objectFit: 'cover' }
                          }}
                          className="sf-glass"
                        >
                          {selectedGarment.fabricType?.charAt(0) || 'F'}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle1" fontWeight={700}>
                            {selectedGarment.fabricType || 'Standard Fabric'}
                          </Typography>
                          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                            <Box
                              sx={{
                                width: 16,
                                height: 16,
                                borderRadius: '50%',
                                bgcolor: selectedGarment.colorSwatch || '#eee',
                                border: '1px solid rgba(0,0,0,0.1)'
                              }}
                            />
                            <Typography variant="caption" color="text.secondary">
                              {selectedGarment.colorSwatch || 'No Swatch'}
                            </Typography>
                          </Stack>
                          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                            {selectedGarment.quantity != null && selectedGarment.quantityUnit
                              ? `Qty: ${selectedGarment.quantity} ${selectedGarment.quantityUnit}`
                              : 'Qty: not recorded'}
                          </Typography>
                        </Box>
                      </Stack>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 8 }}>
                      <Typography variant="caption" color="text.secondary" fontWeight={800} sx={{ textTransform: 'uppercase', mb: 1, display: 'block' }}>
                        Design Notes
                      </Typography>
                      <Box sx={{ p: 2, bgcolor: 'rgba(0,0,0,0.02)', borderRadius: 2, minHeight: 80 }} className="sf-glass">
                        <Typography variant="body2" sx={{ fontStyle: selectedGarment.designNotes ? 'normal' : 'italic', color: selectedGarment.designNotes ? 'text.primary' : 'text.secondary' }}>
                          {selectedGarment.designNotes || 'No custom design notes provided for this garment.'}
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>

                  {/* Keyed by garment so one garment's photos never show under another */}
                  <FabricEvidenceCapturePanel
                    key={selectedGarment.id}
                    garmentId={selectedGarment.id}
                  />

                  <FabricSealPanel
                    orderId={order.id}
                    garmentId={selectedGarment.id}
                    quantity={selectedGarment.quantity ?? null}
                    quantityUnit={selectedGarment.quantityUnit ?? null}
                  />

                  {/* This garment's fabric history; keyed so switching garments never shows a stale one */}
                  <AuditTrailTimeline
                    key={`material-audit-${selectedGarment.id}`}
                    contextId={selectedGarment.id}
                    title="Material Audit Trail"
                  />

                  <DesignBriefPanel
                    orderId={order.id}
                    garmentId={selectedGarment.id}
                    garmentTier={order.garmentTier ?? 'STANDARD'}
                  />

                  {/* Where the customer confirms the fabric and design brief */}
                  <CustomerLinkPanel orderId={order.id} />

                  {/* Fittings apply to bespoke orders only */}
                  {order.garmentTier === 'BESPOKE' && garments && (
                    <FittingsPanel
                      orderId={order.id}
                      garments={garments}
                      isOrderCompleted={!!isOrderCompleted}
                      hasAvailableTransitions={availableTransitions.length > 0}
                    />
                  )}

                  {/* Measurements */}
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={800} sx={{ textTransform: 'uppercase', mb: 2, display: 'block' }}>
                      Precision Measurements
                    </Typography>
                    {(() => {
                      const orderMeasurements = order.measurements || {};
                      const requiredKeys = selectedGarment.requiredMeasurements || [];
                      const filteredMeasurements = Object.entries(orderMeasurements).filter(([key]) => 
                        requiredKeys.length === 0 || requiredKeys.includes(key)
                      );

                      if (filteredMeasurements.length > 0) {
                        return (
                          <Grid container spacing={2}>
                            {filteredMeasurements.map(([key, value]) => (
                              <Grid size={{ xs: 4, sm: 3 }} key={key}>
                                <Box sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2, bgcolor: 'background.paper' }}>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{
                                      fontSize: '0.65rem',
                                      fontWeight: 700,
                                      textTransform: 'uppercase',
                                      display: 'block',
                                      mb: 0.5
                                    }}
                                  >
                                    {key.replace(/_/g, ' ')}
                                  </Typography>
                                  <Typography variant="body1" color="primary" sx={{ fontWeight: 800 }}>
                                    {String(value)}
                                  </Typography>
                                </Box>
                              </Grid>
                            ))}
                          </Grid>
                        );
                      }

                      return (
                        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', py: 2 }}>
                          No measurements recorded for this garment type.
                        </Typography>
                      );
                    })()}
                  </Box>
                </Stack>
              ) : (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                  <Typography variant="h6" color="text.secondary">Select a garment to view evidence</Typography>
                </Box>
              )}
            </Card>

            <Card className="sf-card" sx={{ p: 0, borderRadius: 3, overflow: 'hidden' }}>
              <Box sx={{ px: 3, pt: 3, pb: 0, bgcolor: 'rgba(0,0,0,0.01)', borderBottom: '1px solid', borderColor: 'divider' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                  <Typography variant="h6" fontWeight={800}>Production Workflow</Typography>
                </Stack>
                {selectedGarmentId && (
                  <Tabs
                    value={workflowTab}
                    onChange={(_, v) => setWorkflowTab(v)}
                    sx={{
                      minHeight: 36,
                      '& .MuiTab-root': { minHeight: 36, fontSize: '12px', fontWeight: 700, textTransform: 'none', py: 0.5 },
                      '& .MuiTabs-indicator': { bgcolor: 'primary.main', height: 2 },
                    }}
                  >
                    <Tab label="DAG View" value="graph" />
                    <Tab label={<Stack direction="row" spacing={0.5} alignItems="center"><TimelineIcon sx={{ fontSize: 14 }} /><span>Stage Timeline</span></Stack>} value="timeline" />
                  </Tabs>
                )}
              </Box>
              <Box sx={{ p: 3 }}>
                {selectedGarmentId ? (
                  workflowTab === 'graph'
                    ? <WorkflowGraph garmentId={selectedGarmentId} orderId={order.id} />
                    : <WorkflowStageTimeline garmentId={selectedGarmentId} />
                ) : (
                  <Box sx={{ p: 4, textAlign: 'center' }}>
                    <Typography color="text.secondary">Select a garment to view production graph</Typography>
                  </Box>
                )}
              </Box>
            </Card>

            {/* Messages between the customer and staff */}
            <Card className="sf-card" sx={{ borderRadius: 3, p: 3 }}>
              <OrderMessageThread orderId={order.id} />
            </Card>

            {/* History */}
            <Grid size = {{xs: 12}}>
                <Card className="sf-card" sx={{ height: '100%', borderRadius: 3, p: 3 }}>
                  <AuditTrailTimeline targetId={order.id} />
                </Card>
              </Grid>

              <Grid size = {{xs: 12}}>
                <Card className="sf-card" sx={{ height: '100%', borderRadius: 3, p: 3 }}>
                  <MeasurementHistory customerId={order.customerId} />
                </Card>
              </Grid>
          </Stack>
        </Grid>
      </Grid>

      <Card className="sf-card" sx={{ p: 3, borderRadius: 3, mt: 4 }}>
        <CollectionChecklistPanel
          orderId={order.id}
          lockedAt={order.lockedAt}
          canInitiate={
            user?.role === 'OWNER' || user?.role === 'MANAGER' || user?.role === 'TAILOR'
          }
        />
      </Card>

      {isCompanyAdminOrManager && (
        <EditOrderModal
          open={isEditModalOpen}
          onClose={() => setEditModalOpen(false)}
          order={order}
        />
      )}

      {isCompanyAdminOrManager && selectedGarment && (
        <ReassignFabricDialog
          open={reassignOpen}
          onClose={() => setReassignOpen(false)}
          garmentId={selectedGarment.id}
          garmentName={selectedGarment.name}
          currentOrderId={order.id}
        />
      )}

      {/* Owners and managers may waive only the deposit step, with a reason */}
      {bypassModal && selectedGarment && (
        <Dialog
          open={bypassModal.open}
          onClose={() => setBypassModal(null)}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: '20px',
              background: 'rgba(255, 255, 255, 0.97)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.4)',
            },
          }}
        >
          <DialogTitle sx={{ pb: 1 }}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box sx={{ p: 1, borderRadius: '10px', bgcolor: alpha('#e67e22', 0.1), display: 'flex', alignItems: 'center' }}>
                <WarningAmberIcon sx={{ fontSize: 20, color: '#e67e22' }} />
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                  Acknowledge Deposit
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                  Advance to <strong>{bypassModal.targetStatus.replace(/_/g, ' ')}</strong> before the deposit is recorded
                </Typography>
              </Box>
            </Stack>
          </DialogTitle>
          <DialogContent dividers sx={{ pt: 2 }}>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
              The following activation items are still pending for this order:
            </Typography>
            <Stack spacing={1} sx={{ mb: 3 }}>
              {(order.unverifiedFlags ?? []).map(f => {
                const icons: Record<string, React.ReactElement> = {
                  payment: <PaymentsOutlinedIcon sx={{ fontSize: 16, color: '#8a6d1a' }} />,
                  fabric:  <ContentCutOutlinedIcon sx={{ fontSize: 16, color: '#8a6d1a' }} />,
                  design:  <DesignServicesOutlinedIcon sx={{ fontSize: 16, color: '#8a6d1a' }} />,
                };
                const labels: Record<string, string> = {
                  payment: 'Deposit required',
                  fabric:  'Fabric unconfirmed',
                  design:  'Design pending',
                };
                return (
                  <Stack key={f} direction="row" spacing={1} alignItems="center" sx={{
                    px: 2, py: 1, borderRadius: 2,
                    bgcolor: 'rgba(196, 154, 26, 0.06)',
                    border: '1px solid rgba(196, 154, 26, 0.2)',
                  }}>
                    {icons[f]}
                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#8a6d1a' }}>
                      {labels[f] ?? f}
                    </Typography>
                  </Stack>
                );
              })}
            </Stack>
            <TextField
              fullWidth
              multiline
              minRows={3}
              label="Reason (required)"
              placeholder="Explain why production can start before the deposit is recorded…"
              value={bypassReason}
              onChange={e => setBypassReason(e.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button
              variant="outlined"
              onClick={() => setBypassModal(null)}
              sx={{ borderRadius: 2, fontWeight: 700 }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              disabled={!bypassReason.trim() || attemptTransition.isPending}
              onClick={() => {
                attemptTransition.mutate(
                  { garmentId: selectedGarment.id, targetStatus: bypassModal.targetStatus, bypassReason: bypassReason.trim() },
                  { onSuccess: () => setBypassModal(null) },
                );
              }}
              sx={{
                borderRadius: 2,
                fontWeight: 700,
                bgcolor: '#e67e22',
                '&:hover': { bgcolor: '#d35400' },
              }}
            >
              Acknowledge &amp; Advance
            </Button>
          </DialogActions>
        </Dialog>
      )}

      <Dialog
        open={showForensicProof}
        onClose={() => setShowForensicProof(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '20px',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.4)',
          }
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box sx={{
              p: 1,
              borderRadius: '10px',
              bgcolor: alpha('#1e5c3a', 0.08),
              display: 'flex',
              alignItems: 'center',
            }}>
              <FingerprintIcon sx={{ fontSize: 20, color: '#1e5c3a' }} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#1a2340', lineHeight: 1.2 }}>
                Forensic Proof
              </Typography>
              <Typography variant="caption" sx={{ color: '#6b7280', fontWeight: 500 }}>
                Immutable audit trail for #{truncateId(order.id).toUpperCase()}
              </Typography>
            </Box>
          </Stack>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 3 }}>
          <AuditTrailTimeline targetId={order.id} />
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            onClick={() => setShowForensicProof(false)}
            variant="outlined"
            sx={{ borderRadius: 2, fontWeight: 700 }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={pdfSnackbar?.open ?? false}
        autoHideDuration={6000}
        onClose={() => setPdfSnackbar(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={pdfSnackbar?.severity ?? 'error'}
          onClose={() => setPdfSnackbar(null)}
          sx={{ fontWeight: 600 }}
        >
          {pdfSnackbar?.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
