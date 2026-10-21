import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Card,
  Button,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Divider,
  CircularProgress,
  IconButton,
  Tooltip,
  alpha
} from '@mui/material';
import {
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Straighten as MeasurementsIcon,
  History as HistoryIcon,
  Edit as EditIcon,
  ArrowBack as ArrowBackIcon,
  ShoppingBag as OrderIcon,
  Lock as LockIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { Chip } from '@mui/material';
import { useCustomerProfile, useUpdateMeasurements } from '../features/customers/hooks/useCustomerProfile';
import { useLockMeasurement } from '../features/measurements/hooks/useMeasurementMutation';
import { ErrorState } from '../components/feedback/ErrorState';
import { useToastStore } from '../components/feedback/Toast';
import { truncateId, safeFormatDistanceToNow, safeLocaleDate } from '../utils/format';
import { OrderEntryItem } from '../features/orders/components/OrderEntryItem';
import { Timeline, TimelineItem } from '../components/timeline/Timeline';
import { MobileHeader } from '../components/layout/MobileHeader';
import { NumberField } from '../components/inputs/NumberField';

import './styles/client-profile.css';



export function ClientProfilePage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const showToast = useToastStore((state) => state.showToast);
  const { data: profile, isLoading, isError, error, refetch } = useCustomerProfile(id!);
  const updateMutation = useUpdateMeasurements(id!);
  const lockMutation = useLockMeasurement(id!);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, number>>({});
  const [newFieldName, setNewFieldName] = useState('');
  const inputRefs = useRef<Record<string, any>>({});

  useEffect(() => {
    if (profile?.latestMeasurement) {
      setFormValues(profile.latestMeasurement.measurements);
    } else {
      setFormValues({});
    }
  }, [profile, isModalOpen]);

  const handleAddCustomField = () => {
    if (newFieldName.trim() && !formValues[newFieldName.trim()]) {
      setFormValues({
        ...formValues,
        [newFieldName.trim()]: 0
      });
      setNewFieldName('');
    }
  };

  const handleAutoAdvance = (currentKey: string) => {
    const keys = Object.keys(formValues);
    const currentIndex = keys.indexOf(currentKey);
    if (currentIndex < keys.length - 1) {
      const nextKey = keys[currentIndex + 1];
      inputRefs.current[nextKey]?.focus();
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <CircularProgress color="secondary" />
      </Box>
    );
  }

  if (isError || !profile) {
    return (
      <Box className="container mt-xl">
        <ErrorState 
          error={error} 
          onRetry={() => refetch()} 
          title="Failed to load client profile"
        />
      </Box>
    );
  }

  const { customer, latestMeasurement, orderHistory } = profile;

  const handleUpdateSubmit = async () => {
    // At least one measurement must be entered
    // Empty boxes are left out rather than saved as 0
    const entered = Object.fromEntries(Object.entries(formValues).filter(([, v]) => v > 0));
    if (Object.keys(entered).length === 0) {
      showToast("Validation Error", "Please enter at least one measurement before committing.", "error");
      return;
    }

    try {
      await updateMutation.mutateAsync(entered);
      setIsModalOpen(false);
      showToast("Success", "Measurements updated successfully.", "success");
    } catch (error) {
      console.error("Failed to update measurements", error);
    }
  };

  return (
    <Box className="container" sx={{ pt: { xs: 2, md: 4 }, pb: 8 }}>
      <MobileHeader 
        title={customer.name} 
        subtitle={`ID: ${truncateId(customer.id).toUpperCase()}`}
      />

      <Stack 
        direction="row" 
        spacing={2} 
        alignItems="center" 
        sx={{ mb: 4, display: { xs: 'none', md: 'flex' } }}
      >
        <Button 
          component={Link} 
          to="/customers" 
          startIcon={<ArrowBackIcon />}
          sx={{ color: 'text.secondary', textTransform: 'none', fontWeight: 600 }}
        >
          Back to Clients
        </Button>
      </Stack>

      <Box 
        component="header" 
        className="client-profile-header"
        sx={{ display: { xs: 'none', md: 'flex' } }}
      >
        <Box>
          <Typography variant="h3" sx={{ fontWeight: 800, color: 'text.primary', mb: 1, wordBreak: 'break-word', letterSpacing: '-1px' }}>
            {customer.name}
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 1, sm: 2 }} sx={{ color: 'text.secondary' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <EmailIcon sx={{ fontSize: 16 }} />
              <Typography variant="body2" sx={{ wordBreak: 'break-all', fontWeight: 500 }}>{customer.email || 'No email'}</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <PhoneIcon sx={{ fontSize: 16 }} />
              <Typography variant="body2" sx={{ fontWeight: 500 }}>{customer.phone || 'No phone'}</Typography>
            </Box>
          </Stack>
        </Box>
        <Stack direction="row" spacing={2} className="client-profile-actions">
          <Button 
            variant="contained" 
            color="primary"
            startIcon={<OrderIcon />}
            onClick={() => navigate(`/orders/new?customerId=${customer.id}`)}
            sx={{ borderRadius: '12px', px: 3, py: 1.5, fontWeight: 700 }}
          >
            Create New Order
          </Button>
          <Button 
            variant="contained" 
            color="secondary"
            startIcon={<EditIcon />}
            onClick={() => setIsModalOpen(true)}
            sx={{ borderRadius: '12px', px: 3, py: 1.5, fontWeight: 700 }}
          >
            Record New Measurement
          </Button>
        </Stack>
      </Box>

      {/* Mobile Actions - visible only on small screens */}
      <Stack 
        direction="row" 
        spacing={2} 
        sx={{ mb: 4, display: { xs: 'flex', md: 'none' } }}
      >
        <Button 
          fullWidth
          variant="contained" 
          color="primary"
          onClick={() => navigate(`/orders/new?customerId=${customer.id}`)}
          sx={{ borderRadius: '12px', py: 1.5, fontWeight: 700 }}
        >
          New Order
        </Button>
        <Button 
          fullWidth
          variant="contained" 
          color="secondary"
          onClick={() => setIsModalOpen(true)}
          sx={{ borderRadius: '12px', py: 1.5, fontWeight: 700 }}
        >
          Record
        </Button>
      </Stack>

      <Grid container spacing={4}>
        {/* LEFT PANEL: Info Card */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card className="sf-card client-info-card">
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
              <PersonIcon color="secondary" /> Client Context
            </Typography>
            <Stack spacing={3}>
              <Box>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Secure System Identifier</Typography>
                <Box className="system-id-box">
                  {truncateId(customer.id).toUpperCase()}
                </Box>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Account Created</Typography>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>{new Date(customer.createdAt).toLocaleDateString()}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Measurement Status</Typography>
                <Box sx={{ mt: 1 }}>
                  {latestMeasurement ? (
                    <Box component="span" sx={{ px: 1.5, py: 0.5, bgcolor: alpha('#1e5c3a', 0.1), color: 'primary.main', borderRadius: 'pill', fontSize: '0.75rem', fontWeight: 800 }}>
                      VERSION {latestMeasurement.versionNumber} ACTIVE
                    </Box>
                  ) : (
                    <Box component="span" sx={{ px: 1.5, py: 0.5, bgcolor: alpha('#7f1d1d', 0.1), color: '#d32f2f', borderRadius: 'pill', fontSize: '0.75rem', fontWeight: 800 }}>
                      NO MEASUREMENTS ON FILE
                    </Box>
                  )}
                </Box>
              </Box>
            </Stack>
          </Card>
        </Grid>

        {/* CENTER PANEL: Measurements Grid */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Card className="sf-glass measurement-grid-card">
            <Box sx={{ position: 'absolute', top: -20, right: -20, opacity: 0.05 }}>
              <MeasurementsIcon sx={{ fontSize: 150 }} />
            </Box>
            
            <Typography variant="h6" sx={{ mb: 4, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
              <MeasurementsIcon color="secondary" /> Master Measurements
            </Typography>

            {!latestMeasurement ? (
              <Box sx={{ py: 6, textAlign: 'center', border: '1px dashed', borderColor: 'divider', borderRadius: '16px' }}>
                <Typography variant="body1" sx={{ color: 'text.secondary', mb: 2 }}>No measurement profile found for this client.</Typography>
                <Button variant="outlined" color="primary" onClick={() => setIsModalOpen(true)}>Initialize Profile</Button>
              </Box>
            ) : (
              <Grid container spacing={3}>
                {Object.entries(latestMeasurement.measurements).map(([key, value]) => (
                  <Grid size={{ xs: 6, sm: 4, lg: 3 }} key={key}>
                    <Box className="measurement-point">
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, display: 'block', textTransform: 'uppercase', fontSize: '10px' }}>{key}</Typography>
                      <Typography variant="h5" sx={{ fontWeight: 800 }}>{value}<small style={{ fontSize: '0.6em', opacity: 0.5, marginLeft: 2 }}>cm</small></Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            )}
            
            {latestMeasurement && (
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 4 }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                  Last updated: {safeLocaleDate(latestMeasurement.createdAt)}
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<LockIcon sx={{ fontSize: 14 }} />}
                  onClick={() => lockMutation.mutate({ measurementId: latestMeasurement.id })}
                  disabled={lockMutation.isPending}
                  sx={{
                    borderRadius: '10px',
                    fontWeight: 700,
                    fontSize: '11px',
                    borderColor: alpha('#1e5c3a', 0.3),
                    color: '#1e5c3a',
                    '&:hover': { borderColor: '#1e5c3a', bgcolor: alpha('#1e5c3a', 0.04) },
                  }}
                >
                  {lockMutation.isPending ? 'Locking...' : 'Lock & Seal Version'}
                </Button>
              </Stack>
            )}
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card className="sf-card" sx={{ p: 4, borderRadius: '24px', height: '100%' }}>
            <Typography variant="h6" sx={{ mb: 4, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
              <HistoryIcon color="secondary" /> Order History Projection
            </Typography>

            {orderHistory.length === 0 ? (
              <Box sx={{ py: 4, textAlign: 'center', color: 'text.secondary' }}>
                No past orders found for this client.
              </Box>
            ) : (
              <Stack spacing={0}>
                {orderHistory.map((order) => (
                  <OrderEntryItem 
                    key={order.id} 
                    order={{
                      ...order,
                      customerName: customer.name,
                      garmentName: "Archived Production",
                      eventDate: "" // the summary doesn't include it
                    }}
                    onClick={() => navigate(`/orders/${order.id}`)}
                  />
                ))}
              </Stack>
            )}
          </Card>
        </Grid>

        {/* RIGHT PANEL: Measurement History Timeline */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card className="sf-card" sx={{ p: 4, borderRadius: '24px', height: '100%' }}>
            <Typography variant="h6" sx={{ mb: 4, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
              <MeasurementsIcon color="secondary" /> Measurement Lifecycle
            </Typography>

            <Timeline>
              {(profile.measurementVersions || []).map((v) => (
                <TimelineItem
                  key={v.id}
                  actor="System Recorder"
                  timestamp={safeFormatDistanceToNow(v.createdAt)}
                  action={
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          Version {v.versionNumber} Committed
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {Object.keys((v as any).measurements || {}).length} precision points recorded
                        </Typography>
                      </Box>
                      <Chip
                        label={(v as any).status === 'complete' ? 'SEALED' : 'DRAFT'}
                        size="small"
                        icon={<LockIcon sx={{ fontSize: '10px !important' }} />}
                        sx={{
                          height: 20,
                          fontSize: '9px',
                          fontWeight: 800,
                          borderRadius: '4px',
                          bgcolor: (v as any).status === 'complete' ? alpha('#1e5c3a', 0.1) : alpha('#d97706', 0.1),
                          color: (v as any).status === 'complete' ? '#1e5c3a' : '#d97706',
                          '& .MuiChip-icon': { color: 'inherit', ml: '4px' },
                        }}
                      />
                    </Stack>
                  }
                />
              ))}
              {(!profile.measurementVersions || profile.measurementVersions.length === 0) && (
                <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', py: 4 }}>
                  No historical versions available.
                </Typography>
              )}
            </Timeline>
          </Card>
        </Grid>
      </Grid>

      {/* UPDATE MEASUREMENTS MODAL */}
      <Dialog 
        open={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { borderRadius: '24px', p: 2 }
        }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>
          {latestMeasurement ? `Record New Measurement Version (v${(latestMeasurement.versionNumber || 0) + 1})` : 'Initialize Measurements'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary' }}>
            Historical integrity is enforced. Saving these changes will create a new immutable version.
          </Typography>
          
          <Grid container spacing={2}>
            {Object.keys(formValues).map((key) => (
              <Grid size={{ xs: 12, sm: 4 }} key={key}>
                <NumberField
                  fullWidth
                  label={key}
                  value={formValues[key]}
                  onChange={(val) => setFormValues({ ...formValues, [key]: val === "" ? 0 : val })}
                  onEnter={() => handleAutoAdvance(key)}
                  inputRef={(el: any) => inputRefs.current[key] = el}
                  InputProps={{
                    endAdornment: (
                      <>
                        <Typography variant="caption" sx={{ opacity: 0.5 }}>cm</Typography>
                        {/* Nothing is saved until Commit, so a wrong or unwanted line can simply be dropped */}
                        <Tooltip title="Remove measurement">
                          <IconButton
                            size="small"
                            edge="end"
                            aria-label={`Remove ${key}`}
                            onClick={() => {
                              const next = { ...formValues };
                              delete next[key];
                              setFormValues(next);
                            }}
                          >
                            <CloseIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                      </>
                    )
                  }}
                  variant="outlined"
                  size="small"
                />
              </Grid>
            ))}
            
            <Grid size={{ xs: 12 }}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 1 }}>ADD CUSTOM PRECISION POINT</Typography>
              <Stack direction="row" spacing={1}>
                <TextField 
                  size="small" 
                  placeholder="e.g. Wrist, Bicep..." 
                  value={newFieldName}
                  onChange={(e) => setNewFieldName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustomField(); } }}
                  inputProps={{ 'aria-label': 'New measurement label' }}
                  sx={{ flex: 1 }}
                />
                <Button 
                  variant="outlined" 
                  color="secondary" 
                  onClick={handleAddCustomField}
                  disabled={!newFieldName.trim()}
                  sx={{ borderRadius: '8px' }}
                >
                  Add Label
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setIsModalOpen(false)} sx={{ color: 'text.secondary' }}>Cancel</Button>
          <Button 
            variant="contained" 
            color="secondary" 
            onClick={handleUpdateSubmit}
            disabled={updateMutation.isPending}
            sx={{ borderRadius: '12px', px: 4, fontWeight: 700 }}
          >
            {updateMutation.isPending ? 'Saving...' : 'Commit Version'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
