import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Button,
  Card,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  LinearProgress,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  Step,
  StepLabel,
  Stepper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  ContentCopy as CopyIcon,
  Add as AddIcon,
  LinkOff as UnlinkIcon,
  PhotoCamera as CameraIcon,
} from '@mui/icons-material';
import { groupOrderApi, groupShareUrl, type GroupOrderDetail, type GroupOrderInput, type StaffGroupGarmentStatus } from '../features/group-order/group-order.api';
import { GroupSettingsFields } from '../features/group-order/GroupSettingsFields';
import { useOrders } from '../features/orders/hooks/useOrders';
import { FabricEvidenceCapturePanel } from '../features/orders/components/FabricEvidenceCapturePanel';
import { FabricSealPanel } from '../features/orders/components/FabricSealPanel';
import { RiskBadge } from '../components/ui/RiskBadge';
import { showToast } from '../components/feedback/Toast';
import { keys } from '../query/keys';
import { formatDeadline } from '../utils/format';
import { parseApiError } from '../lib/errors';

function AddOrderDialog({ groupId, open, onClose }: { groupId: string; open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const { data } = useOrders(1, 20, query.trim() || undefined);
  // The list has a row per garment; offer each order once, and only ones in no group
  const orders = [...new Map((data?.items ?? []).filter((o) => !o.groupOrderId).map((o) => [o.id, o])).values()];

  const link = useMutation({
    mutationFn: (orderId: string) => groupOrderApi.linkOrder(groupId, orderId),
    onSuccess: (detail) => {
      queryClient.setQueryData(keys.groupOrders.detail(groupId), detail);
      queryClient.invalidateQueries({ queryKey: keys.orders.all });
      showToast('Order added', 'The order is now part of this group.', 'success');
      onClose();
    },
    onError: (err) => showToast('Could not add order', parseApiError(err).detail, 'error'),
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>Add an existing order</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          size="small"
          placeholder="Search order #, client name or phone"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          sx={{ mt: 1, mb: 1 }}
        />
        <List dense>
          {orders.length === 0 && <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>No open orders outside a group match.</Typography>}
          {orders.map((o) => (
            <ListItemButton key={o.id} disabled={link.isPending} onClick={() => link.mutate(o.id)}>
              <ListItemText primary={`#${o.orderNumber} · ${o.customerName}`} secondary={`Event ${o.deadline}`} />
            </ListItemButton>
          ))}
        </List>
      </DialogContent>
      <DialogActions><Button onClick={onClose}>Close</Button></DialogActions>
    </Dialog>
  );
}

// US-13.5: one garment after another, photo then fabric confirmation, without leaving the group
function BulkFabricIntakeDialog({ garments, open, onClose }: { garments: StaffGroupGarmentStatus[]; open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [index, setIndex] = useState(0);
  const garment = garments[index];

  const finish = () => {
    queryClient.invalidateQueries({ queryKey: ['groupOrders'] });
    onClose();
  };

  return (
    <Dialog open={open} onClose={finish} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>Fabric intake for the group</DialogTitle>
      <DialogContent>
        {garments.length === 0 ? (
          <Typography color="text.secondary">Every garment in this group already has its fabric confirmed.</Typography>
        ) : (
          <>
            <Stepper activeStep={index} alternativeLabel sx={{ mb: 3, overflowX: 'auto' }}>
              {garments.map((g) => (
                <Step key={g.garmentId}><StepLabel>{g.memberFirstName}</StepLabel></Step>
              ))}
            </Stepper>
            {garment && (
              <Stack spacing={3} key={garment.garmentId}>
                <Typography variant="h6" fontWeight={800}>
                  {garment.customerName} · {garment.garmentName} (order #{garment.orderNumber})
                </Typography>
                <FabricEvidenceCapturePanel garmentId={garment.garmentId} />
                <FabricSealPanel
                  orderId={garment.orderId}
                  garmentId={garment.garmentId}
                  quantity={garment.quantity}
                  quantityUnit={garment.quantityUnit}
                />
              </Stack>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button disabled={index === 0} onClick={() => setIndex((i) => i - 1)}>Previous</Button>
        {index < garments.length - 1 ? (
          <Button variant="contained" onClick={() => setIndex((i) => i + 1)}>Next garment</Button>
        ) : (
          <Button variant="contained" onClick={finish}>Done</Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

// Starts from the saved group; keyed by group id, so opening another group starts afresh
function GroupSettingsCard({ group }: { group: GroupOrderDetail }) {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<GroupOrderInput>(() => ({
    name: group.name,
    eventDate: group.eventDate,
    storeId: group.storeId,
    leadTailorId: group.leadTailorId,
    coordinatorCustomerId: group.coordinatorCustomerId,
  }));

  const save = useMutation({
    mutationFn: () => groupOrderApi.update(group.id, settings),
    onSuccess: (detail) => {
      queryClient.setQueryData(keys.groupOrders.detail(group.id), detail);
      queryClient.invalidateQueries({ queryKey: ['groupOrders', 'list'] });
      showToast('Group saved', 'Unassigned garments now go to the lead tailor.', 'success');
    },
    onError: (err) => showToast('Could not save the group', parseApiError(err).detail, 'error'),
  });

  return (
    <Card className="sf-card" sx={{ p: 3, borderRadius: 3, width: { xs: '100%', md: 340 }, flexShrink: 0 }}>
      <Typography variant="h6" fontWeight={800} sx={{ mb: 2 }}>Group settings</Typography>
      <GroupSettingsFields value={settings} onChange={setSettings} coordinatorName={group.coordinatorName} />
      <Button
        fullWidth
        variant="contained"
        sx={{ mt: 2 }}
        disabled={save.isPending || !settings.name?.trim() || !settings.eventDate}
        onClick={() => save.mutate()}
      >
        {save.isPending ? 'Saving...' : 'Save'}
      </Button>
    </Card>
  );
}

export function GroupOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: group, isLoading, isError } = useQuery({
    queryKey: keys.groupOrders.detail(id!),
    queryFn: () => groupOrderApi.get(id!),
    enabled: !!id,
  });
  const [addOpen, setAddOpen] = useState(false);
  const [intakeOpen, setIntakeOpen] = useState(false);

  const unlink = useMutation({
    mutationFn: (orderId: string) => groupOrderApi.unlinkOrder(id!, orderId),
    onSuccess: (detail) => {
      queryClient.setQueryData(keys.groupOrders.detail(id!), detail);
      queryClient.invalidateQueries({ queryKey: keys.orders.all });
    },
    onError: (err) => showToast('Could not remove the order', parseApiError(err).detail, 'error'),
  });

  if (isLoading) return <LinearProgress />;
  if (isError || !group) return <Typography sx={{ p: 4 }}>Group not found.</Typography>;

  const shareUrl = groupShareUrl(group.groupToken);
  const awaitingFabric = group.garments.filter((g) => !g.fabricConfirmed);
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      showToast('Link copied', 'Share it with everyone in the group.', 'success');
    } catch {
      showToast('Copy failed', shareUrl, 'error');
    }
  };

  return (
    <Box className="container" sx={{ py: 3 }}>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/group-orders')} sx={{ mb: 2, textTransform: 'none' }}>
        Group orders
      </Button>

      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2} sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={800}>{group.name}</Typography>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }} flexWrap="wrap" useFlexGap>
            <Typography color="text.secondary">Event {formatDeadline(group.eventDate)}</Typography>
            <RiskBadge level={group.aggregatedHealth.collectiveRiskLevel} />
            <Chip size="small" label={`${group.aggregatedHealth.completedMemberCount}/${group.aggregatedHealth.totalMemberCount} ready`} />
          </Stack>
        </Box>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Button variant="outlined" startIcon={<CopyIcon />} onClick={copyLink}>Copy group link</Button>
          <Button variant="outlined" startIcon={<CameraIcon />} onClick={() => setIntakeOpen(true)}>Fabric intake</Button>
          <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setAddOpen(true)}>Add existing order</Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate(`/orders/new?groupId=${group.id}`)}>New order in group</Button>
        </Stack>
      </Stack>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems="flex-start">
        <GroupSettingsCard key={group.id} group={group} />

        <Card className="sf-card" sx={{ borderRadius: 3, flex: 1, width: '100%', overflow: 'hidden' }}>
          <Box sx={{ p: 3, pb: 1 }}>
            <Typography variant="h6" fontWeight={800}>Garments ({group.garments.length})</Typography>
            <LinearProgress
              variant="determinate"
              value={group.aggregatedHealth.collectiveProgressPercent}
              sx={{ mt: 1, height: 6, borderRadius: 3 }}
            />
          </Box>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Member</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Garment</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Stage</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Risk</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Tailor</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Fabric</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {group.garments.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                        No orders yet. Add existing orders or create new ones in this group.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
                {group.garments.map((g) => (
                  <TableRow key={g.garmentId} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/orders/${g.orderId}`, { state: { targetGarmentId: g.garmentId } })}>
                    <TableCell>{g.customerName}<Typography variant="caption" display="block" color="text.secondary">#{g.orderNumber}</Typography></TableCell>
                    <TableCell>{g.garmentName}</TableCell>
                    <TableCell>{g.currentStage} · {g.progressPercent}%</TableCell>
                    <TableCell><RiskBadge level={g.riskLevel} /></TableCell>
                    <TableCell>{g.assignedTailorName ?? <Typography variant="caption" color="text.disabled">Unassigned</Typography>}</TableCell>
                    <TableCell>{g.fabricConfirmed ? 'Confirmed' : 'Waiting'}</TableCell>
                    <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                      <Tooltip title="Remove the order from this group">
                        <IconButton size="small" disabled={unlink.isPending} onClick={() => unlink.mutate(g.orderId)}>
                          <UnlinkIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      </Stack>

      <AddOrderDialog groupId={group.id} open={addOpen} onClose={() => setAddOpen(false)} />
      {intakeOpen && <BulkFabricIntakeDialog garments={awaitingFabric} open onClose={() => setIntakeOpen(false)} />}
    </Box>
  );
}
