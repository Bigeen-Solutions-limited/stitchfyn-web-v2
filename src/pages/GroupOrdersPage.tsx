import React, { useState } from 'react';
import {
  Box,
  Typography,
  Stack,
  Card,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Skeleton,
  alpha,
  Pagination,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Groups as GroupsIcon,
  Add as AddIcon,
  OpenInNew as OpenInNewIcon,
  CalendarToday as CalendarIcon,
  Tag as TagIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { groupOrderApi, type GroupOrderListItem } from '../features/group-order/group-order.api';
import { keys } from '../query/keys';
import { showToast } from '../components/feedback/Toast';

interface CreateGroupDialogProps {
  open: boolean;
  onClose: () => void;
}

const CreateGroupDialog: React.FC<CreateGroupDialogProps> = ({ open, onClose }) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: '', eventDate: '' });

  const createMutation = useMutation({
    mutationFn: () => groupOrderApi.create({ name: form.name.trim(), eventDate: form.eventDate }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groupOrders'] });
      showToast('Group Created', 'The group order has been registered.', 'success');
      setForm({ name: '', eventDate: '' });
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.eventDate) return;
    createMutation.mutate();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: '24px', p: 1 } }}>
      <form onSubmit={handleSubmit}>
        <DialogTitle sx={{ fontWeight: 800 }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <GroupsIcon sx={{ color: 'primary.main', fontSize: 22 }} />
            <span>New Group Order</span>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            <TextField
              label="Group Name"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              required
              fullWidth
              size="small"
              placeholder="e.g. Johnson Wedding Party"
              InputProps={{ sx: { borderRadius: '12px' } }}
            />
            <TextField
              label="Event Date"
              type="date"
              value={form.eventDate}
              onChange={(e) => setForm((p) => ({ ...p, eventDate: e.target.value }))}
              required
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
              InputProps={{ sx: { borderRadius: '12px' } }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button onClick={onClose} sx={{ color: 'text.secondary', borderRadius: '10px' }}>Cancel</Button>
          <Button
            type="submit"
            variant="contained"
            disabled={createMutation.isPending}
            sx={{ borderRadius: '10px', fontWeight: 700, px: 3 }}
          >
            {createMutation.isPending ? 'Creating...' : 'Create Group'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

const GroupCard: React.FC<{ group: GroupOrderListItem }> = ({ group }) => {
  const navigate = useNavigate();
  const eventDate = new Date(group.eventDate);
  const daysUntil = Math.ceil((eventDate.getTime() - Date.now()) / 86_400_000);
  const isPast = daysUntil < 0;
  const isUrgent = daysUntil >= 0 && daysUntil <= 14;

  return (
    <Card
      className="sf-glass"
      sx={{
        p: 3,
        borderRadius: '20px',
        border: '1px solid',
        borderColor: 'rgba(255,255,255,0.3)',
        bgcolor: 'rgba(255,255,255,0.5)',
        backdropFilter: 'blur(10px)',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 8px 24px rgba(0,0,0,0.06)' },
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#1a2340', mb: 0.5 }}>
            {group.name}
          </Typography>
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 1 }}>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <CalendarIcon sx={{ fontSize: 13, color: 'text.secondary' }} />
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                {eventDate.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
              </Typography>
            </Stack>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <TagIcon sx={{ fontSize: 13, color: 'text.secondary' }} />
              <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>
                {group.groupToken}
              </Typography>
            </Stack>
          </Stack>
        </Box>

        <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0, ml: 2 }}>
          {isPast ? (
            <Chip label="Past" size="small" sx={{ height: 20, fontSize: '9px', fontWeight: 700, bgcolor: alpha('#6b7280', 0.1), color: '#6b7280', borderRadius: '4px' }} />
          ) : isUrgent ? (
            <Chip label={`${daysUntil}d`} size="small" sx={{ height: 20, fontSize: '9px', fontWeight: 700, bgcolor: alpha('#d97706', 0.1), color: '#d97706', borderRadius: '4px' }} />
          ) : (
            <Chip label={`${daysUntil}d`} size="small" sx={{ height: 20, fontSize: '9px', fontWeight: 700, bgcolor: alpha('#1e5c3a', 0.08), color: '#1e5c3a', borderRadius: '4px' }} />
          )}
          <Tooltip title="Open Group Dashboard">
            <IconButton
              size="small"
              onClick={() => navigate(`/groups/${group.groupToken}`)}
              sx={{ color: 'primary.main' }}
            >
              <OpenInNewIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>
    </Card>
  );
};

export const GroupOrdersPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const limit = 20;

  const { data, isLoading } = useQuery({
    queryKey: keys.groupOrders.list(page, limit),
    queryFn: () => groupOrderApi.list(page, limit),
  });

  const groups = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;

  return (
    <Box className="container" sx={{ py: 4 }}>
      <header style={{ marginBottom: 32 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" spacing={2} alignItems="center">
            <GroupsIcon sx={{ fontSize: 32, color: 'primary.main' }} />
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 800, fontSize: { xs: '1.25rem', md: '2.125rem' } }}>
                Group Orders
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                Coordinate multi-member garment orders for weddings, events, and parties.
              </Typography>
            </Box>
          </Stack>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateOpen(true)}
            sx={{ borderRadius: '12px', fontWeight: 700, textTransform: 'none', flexShrink: 0, display: { xs: 'none', sm: 'flex' } }}
          >
            New Group
          </Button>
        </Stack>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateOpen(true)}
          fullWidth
          sx={{ borderRadius: '12px', fontWeight: 700, textTransform: 'none', mt: 2, display: { xs: 'flex', sm: 'none' } }}
        >
          New Group
        </Button>
      </header>

      {isLoading ? (
        <Stack spacing={2}>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} variant="rectangular" height={80} sx={{ borderRadius: '20px' }} />
          ))}
        </Stack>
      ) : groups.length === 0 ? (
        <Card
          className="sf-glass"
          sx={{ p: 6, borderRadius: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '35vh', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.4)' }}
        >
          <GroupsIcon sx={{ fontSize: 48, color: alpha('#1e5c3a', 0.2), mb: 2 }} />
          <Typography variant="body1" sx={{ fontWeight: 700, color: '#374151', mb: 1 }}>No group orders yet</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3, textAlign: 'center', maxWidth: 400 }}>
            Create a group order to coordinate multiple garments for a shared event. Each member gets a linked production track.
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateOpen(true)}
            sx={{ borderRadius: '12px', fontWeight: 700, textTransform: 'none' }}
          >
            Create First Group
          </Button>
        </Card>
      ) : (
        <Stack spacing={2}>
          {groups.map((group) => (
            <GroupCard key={group.id} group={group} />
          ))}
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', pt: 2 }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_, v) => setPage(v)}
                color="primary"
                shape="rounded"
              />
            </Box>
          )}
        </Stack>
      )}

      <CreateGroupDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </Box>
  );
};
