import { useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
  Tooltip,
  alpha,
  AlertTitle
} from '@mui/material';
import FactoryIcon from '@mui/icons-material/Factory';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import QueryStatsIcon from '@mui/icons-material/QueryStats';
import ScheduleIcon from '@mui/icons-material/Schedule';
import EventIcon from '@mui/icons-material/Event';
import BlockIcon from '@mui/icons-material/Block';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { format } from 'date-fns';

import { useActiveTasks } from '../features/workflow/hooks/useProductionBoard';
import { usePermissions } from '../features/auth/use-permissions';
import type { ActiveFloorTask } from '../features/workflow/workflow.api';
import { WorkflowGraph } from '../features/workflow/components/WorkflowGraph';
import { QueryLoading, QueryError, QueryEmpty } from '../components/feedback/QueryState';
import { useAvailableTransitions, useAttemptTransition } from '../features/production/hooks/useProductionMutation';
import '../design-system/layout.css';

const STATUS_CONFIG: Record<string, { color: string; bgColor: string }> = {
  'Cutting':   { color: '#1a2340',          bgColor: 'rgba(26,35,64,0.07)'   },
  'Sewing':    { color: '#2d6a8f',          bgColor: 'rgba(45,106,143,0.08)' },
  'Fitting':   { color: '#8b6914',          bgColor: 'rgba(196,154,26,0.10)' },
  'Finishing': { color: '#1e5c3a',         bgColor: 'rgba(30,92,58,0.08)'   },
  'Default':   { color: '#666',             bgColor: '#f0f0f0'               },
};

const getStatusStyles = (status: string) =>
  STATUS_CONFIG[status] ?? STATUS_CONFIG['Default'];

// A stable brand colour per garment name, so cards stay on-palette
const AVATAR_COLORS = ['#1e5c3a', '#c49a1a', '#1a2340', '#24714a', '#8a6d12', '#3f4a6b'];
const stringToColor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

// Prefer the tailor's name; older API responses only carry the email
const tailorLabel = (task: { tailorName?: string | null; tailorEmail?: string | null }) =>
  task.tailorName || task.tailorEmail?.split('@')[0] || '';

const isAtRisk = (task: ActiveFloorTask) =>
  task.riskLevel === 'OVERDUE' || task.riskLevel === 'AT_RISK';

const formatTableDate = (dateStr?: string) => {
  if (!dateStr) return '--';
  try { return format(new Date(dateStr), 'MMM d, yyyy'); } catch { return dateStr; }
};

interface KPICardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  accentColor: string;
}

function KPICard({ title, value, icon, accentColor }: KPICardProps) {
  return (
    <Card
      elevation={0}
      sx={{
        height: '100%',
        backgroundImage: 'none',
        bgcolor: 'var(--sf-parchment)',
        border: '1px solid',
        borderColor: 'divider',
        borderLeft: '3px solid',
        borderLeftColor: accentColor,
        borderRadius: '12px',
        p: 2.5,
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        transition: 'box-shadow 0.2s ease',
        '&:hover': { boxShadow: '0 4px 16px rgba(0,0,0,0.06)' },
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography
          variant="overline"
          sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: 0.8, fontSize: '0.65rem' }}
        >
          {title}
        </Typography>
        <Box sx={{ color: accentColor, opacity: 0.6, '& svg': { fontSize: 18 } }}>
          {icon}
        </Box>
      </Stack>
      <Typography
        variant="h3"
        sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1, mt: 0.5 }}
      >
        {value}
      </Typography>
    </Card>
  );
}

interface QuickUpdateModalProps {
  task: ActiveFloorTask | null;
  onClose: () => void;
}

function QuickUpdateModal({ task, onClose }: QuickUpdateModalProps) {
  const { data: transitions = [], isLoading: isTransitionsLoading } = useAvailableTransitions(task?.garmentId ?? '');
  const transitionMutation = useAttemptTransition();
  const [selectedTarget, setSelectedTarget] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!task) return null;

  const handleSave = async () => {
    setErrorMsg(null);
    if (!selectedTarget) return;
    try {
      const result = await transitionMutation.mutateAsync({ garmentId: task.garmentId, targetStatus: selectedTarget });
      if (!result.success) {
        setErrorMsg(result.rejectionBundle?.message ?? 'Transition failed');
      } else {
        onClose();
      }
    } catch (e: any) {
      setErrorMsg(e.response?.data?.message ?? 'An unexpected error occurred');
    }
  };

  return (
    <Dialog
      open={!!task}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          backgroundImage: 'none',
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
        },
      }}
    >
      <DialogTitle sx={{ pb: 1, pt: 3 }}>
        <Typography variant="h6" fontWeight={700} color="text.primary">
          Advance production stage
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {task.garmentName} — currently: <strong>{task.stageName}</strong>
        </Typography>
      </DialogTitle>
      <DialogContent sx={{ pt: 2, pb: 1 }}>
        <Stack spacing={3} sx={{ mt: 1 }}>
          {errorMsg && (
            <Alert severity="error" sx={{ borderRadius: 2 }}>
              <AlertTitle sx={{ fontWeight: 700 }}>Can't advance</AlertTitle>
              {errorMsg}
            </Alert>
          )}
          <Box>
            <Typography
              variant="caption"
              sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', mb: 1, display: 'block' }}
            >
              Next stage
            </Typography>
            <FormControl fullWidth size="small">
              <Select
                value={selectedTarget}
                onChange={(e) => setSelectedTarget(e.target.value)}
                disabled={isTransitionsLoading}
                sx={{ borderRadius: 2, bgcolor: 'background.paper' }}
                displayEmpty
              >
                {isTransitionsLoading ? (
                  <MenuItem disabled value="">
                    <CircularProgress size={16} sx={{ mr: 1 }} /> Loading options…
                  </MenuItem>
                ) : (
                  transitions.map((t) => (
                    <MenuItem key={t} value={t}>
                      {t === 'CANCELLED' ? 'Cancel order' : `Advance to ${t}`}
                    </MenuItem>
                  ))
                )}
                {transitions.length === 0 && !isTransitionsLoading && (
                  <MenuItem disabled value="">No valid transitions available</MenuItem>
                )}
              </Select>
            </FormControl>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 3, gap: 1 }}>
        <Button onClick={onClose} sx={{ color: 'text.secondary', textTransform: 'none', fontWeight: 600 }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={transitionMutation.isPending || isTransitionsLoading || !selectedTarget}
          sx={{ borderRadius: 2, px: 3, textTransform: 'none', fontWeight: 700 }}
        >
          {transitionMutation.isPending ? 'Saving…' : 'Advance stage'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

interface ExecutionDialogProps {
  task: ActiveFloorTask | null;
  onClose: () => void;
}

// Stage work for whoever is on the floor: complete stages and add progress photos (tailors cannot open the order page)
function ExecutionDialog({ task, onClose }: ExecutionDialogProps) {
  if (!task) return null;

  return (
    <Dialog
      open={!!task}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3, backgroundImage: 'none' } }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <FactoryIcon color="primary" />
          <Box>
            <Typography variant="h6" fontWeight={700}>Production stages</Typography>
            <Typography variant="body2" color="text.secondary">
              {task.garmentName} — {task.customerName}
            </Typography>
          </Box>
        </Stack>
      </DialogTitle>
      <DialogContent dividers sx={{ p: 3 }}>
        <WorkflowGraph garmentId={task.garmentId} orderId={task.orderId} />
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

interface TaskMobileCardProps {
  task: ActiveFloorTask;
  onQuickUpdate: () => void;
  onOpenStage: () => void;
  canViewOrder: boolean;
  navigate: (path: string) => void;
}

function TaskMobileCard({ task, onQuickUpdate, onOpenStage, canViewOrder, navigate }: TaskMobileCardProps) {
  const atRisk = isAtRisk(task);
  const statusStyle = getStatusStyles(task.stageName);

  return (
    <Card
      sx={{
        p: 2.5,
        borderRadius: '16px',
        mb: 2,
        backgroundImage: 'none',
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: atRisk ? alpha('#ef4444', 0.3) : 'divider',
        boxShadow: '0 2px 12px rgba(0,0,0,0.03)',
        '&:active': { transform: 'scale(0.99)' },
      }}
    >
      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <Avatar
          src={task.fabric_image_base64}
          variant="rounded"
          sx={{ width: 52, height: 52, borderRadius: '10px', bgcolor: stringToColor(task.garmentName ?? 'G') }}
        >
          {task.garmentName?.charAt(0)}
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
            <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.disabled' }}>
              #{task.orderNumber}
            </Typography>
            <Chip
              label={task.stageName}
              size="small"
              sx={{ height: 20, fontSize: 10, fontWeight: 700, color: statusStyle.color, bgcolor: statusStyle.bgColor, borderRadius: '6px' }}
            />
          </Stack>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.2, mb: 0.25 }}>
            {task.customerName}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>
            {task.garmentName}
          </Typography>
        </Box>
      </Stack>

      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Avatar sx={{ width: 22, height: 22, fontSize: 10, bgcolor: 'primary.main', fontWeight: 700 }}>
            {task.tailorEmail?.[0].toUpperCase() ?? '?'}
          </Avatar>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
            {task.tailorEmail ? tailorLabel(task) : 'Unassigned'}
          </Typography>
        </Stack>
        <Typography
          variant="caption"
          sx={{ color: atRisk ? 'error.main' : 'text.disabled', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5 }}
        >
          <ScheduleIcon sx={{ fontSize: 13 }} />
          {task.deadline ? format(new Date(task.deadline), 'MMM d') : '--'}
        </Typography>
      </Stack>

      <Stack direction="row" spacing={1}>
        {canViewOrder && (
          <Button
            fullWidth
            variant="outlined"
            size="small"
            onClick={() => navigate(`/orders/${task.orderId}`)}
            sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 600, borderColor: 'divider' }}
          >
            View order
          </Button>
        )}
        <Button
          fullWidth
          variant="outlined"
          size="small"
          onClick={onQuickUpdate}
          sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 600, borderColor: 'divider' }}
        >
          Status
        </Button>
        <Button
          fullWidth
          variant="contained"
          color="secondary"
          size="small"
          onClick={onOpenStage}
          sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 700 }}
        >
          Work on stage
        </Button>
      </Stack>
    </Card>
  );
}

export function ProductionBoardPage() {
  const navigate = useNavigate();
  const { data: tasks = [], isLoading, isError, refetch } = useActiveTasks();
  const [selectedTask, setSelectedTask] = useState<ActiveFloorTask | null>(null);
  const [quickUpdateTask, setQuickUpdateTask] = useState<ActiveFloorTask | null>(null);
  const { hasCapability } = usePermissions();
  const canViewOrder = hasCapability('MANAGE_ORDERS');

  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('All');
  const [lifecycleStatusFilter, setLifecycleStatusFilter] = useState('All');
  const [tailorFilter, setTailorFilter] = useState('All');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const kpis = useMemo(() => {
    const active = tasks.length;
    const dueToday = tasks.filter(t => {
      if (!t.deadline) return false;
      const d = new Date(t.deadline);
      return d.toDateString() === new Date().toDateString();
    }).length;
    const fittings = tasks.filter(t => t.stageName === 'Fitting').length;
    const blocked = tasks.filter(t => t.status === 'BLOCKED').length;
    return [
      { title: 'In production', value: active,    icon: <QueryStatsIcon />, accentColor: 'var(--sf-green)' },
      { title: 'Due today',     value: dueToday,  icon: <ScheduleIcon />,   accentColor: '#ef4444'         },
      { title: 'Fittings',      value: fittings,  icon: <EventIcon />,      accentColor: 'var(--sf-gold)'  },
      { title: 'Blocked',       value: blocked,   icon: <BlockIcon />,      accentColor: 'var(--sf-navy)'  },
    ];
  }, [tasks]);

  const atRiskTasks = useMemo(
    () => tasks.filter(t => t.riskLevel === 'OVERDUE' || t.riskLevel === 'AT_RISK'),
    [tasks]
  );

  const stageCounts = useMemo(() => {
    const counts = new Map<string, number>();
    tasks.forEach(t => counts.set(t.stageName, (counts.get(t.stageName) ?? 0) + 1));
    return counts;
  }, [tasks]);

  const uniqueStages = useMemo(() => Array.from(new Set(tasks.map(t => t.stageName))).sort(), [tasks]);

  const uniqueTailors = useMemo(() => {
    const tailorMap = new Map<string, string>();
    tasks.forEach(t => { if (t.assignedTailorId && t.tailorEmail) tailorMap.set(t.assignedTailorId, tailorLabel(t)); });
    return Array.from(tailorMap.entries());
  }, [tasks]);

  const lifecycleStatuses = ['PENDING', 'ACTIVE', 'COMPLETED', 'BLOCKED'];

  const filteredTasks = useMemo(() => tasks.filter(task => {
    const searchStr = search.toLowerCase();
    const matchesSearch =
      (task.orderId ?? '').toLowerCase().includes(searchStr) ||
      String(task.orderNumber ?? '').includes(searchStr) ||
      (task.customerName ?? '').toLowerCase().includes(searchStr);
    return (
      matchesSearch &&
      (stageFilter === 'All' || task.stageName === stageFilter) &&
      (lifecycleStatusFilter === 'All' || task.status === lifecycleStatusFilter) &&
      (tailorFilter === 'All' || task.assignedTailorId === tailorFilter)
    );
  }), [tasks, search, stageFilter, lifecycleStatusFilter, tailorFilter]);

  const paginatedTasks = useMemo(
    () => filteredTasks.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [filteredTasks, page, rowsPerPage]
  );

  const handleChangePage = (_: unknown, newPage: number) => setPage(newPage);
  const handleChangeRowsPerPage = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(e.target.value, 10));
    setPage(0);
  };

  if (isLoading) {
    return (
      <Box sx={{ p: 4 }}>
        <QueryLoading label="Loading production floor…" />
      </Box>
    );
  }

  if (isError) {
    return (
      <Box sx={{ p: 4 }}>
        <QueryError
          message="Couldn't load the production floor. Check your connection and try again."
          onRetry={() => refetch()}
        />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2.5, md: 4, lg: 6 }, maxWidth: 1600, mx: 'auto', pb: 12 }}>

      <Box sx={{ mb: 5 }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'stretch', md: 'flex-end' }}
          spacing={3}
        >
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', letterSpacing: '-0.03em', mb: 0.5 }}>
              Production floor
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {tasks.length} active garment{tasks.length !== 1 ? 's' : ''} across {stageCounts.size} stage{stageCounts.size !== 1 ? 's' : ''}
            </Typography>
          </Box>
          <TextField
            placeholder="Search order, client…"
            size="small"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" sx={{ color: 'text.disabled' }} />
                </InputAdornment>
              ),
            }}
            sx={{
              width: { xs: '100%', md: 280 },
              '& .MuiOutlinedInput-root': { borderRadius: '12px', bgcolor: 'background.paper' },
            }}
          />
        </Stack>
      </Box>

      {/* At-risk callout — shown only when needed */}
      {atRiskTasks.length > 0 && (
        <Box
          sx={{
            mb: 4,
            px: 2.5,
            py: 1.75,
            borderRadius: '10px',
            bgcolor: alpha('#c49a1a', 0.06),
            border: '1px solid',
            borderColor: alpha('#c49a1a', 0.25),
            display: 'flex',
            alignItems: 'flex-start',
            gap: 1.5,
          }}
        >
          <WarningAmberIcon sx={{ fontSize: 18, color: '#8b6914', mt: 0.15, flexShrink: 0 }} />
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 700, color: '#8b6914', display: 'block', mb: 0.25 }}>
              {atRiskTasks.length} garment{atRiskTasks.length !== 1 ? 's' : ''} need attention
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {atRiskTasks
                .slice(0, 4)
                .map(t => `${t.garmentName} (${t.customerName})`)
                .join(' · ')}
              {atRiskTasks.length > 4 && ` · +${atRiskTasks.length - 4} more`}
            </Typography>
          </Box>
        </Box>
      )}

      {/* KPI strip */}
      <Grid container spacing={2.5} sx={{ mb: 5 }}>
        {kpis.map((kpi, idx) => (
          <Grid size={{ xs: 6, lg: 3 }} key={idx}>
            <KPICard title={kpi.title} value={kpi.value} icon={kpi.icon} accentColor={kpi.accentColor} />
          </Grid>
        ))}
      </Grid>

      {/* Stage pipeline summary */}
      {uniqueStages.length > 0 && (
        <Box sx={{ mb: 3, display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
          <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 600, mr: 0.5 }}>
            Stages
          </Typography>
          <Chip
            label={`All (${tasks.length})`}
            size="small"
            onClick={() => setStageFilter('All')}
            variant={stageFilter === 'All' ? 'filled' : 'outlined'}
            sx={{
              fontWeight: 700,
              fontSize: '0.72rem',
              bgcolor: stageFilter === 'All' ? 'var(--sf-green)' : 'transparent',
              color: stageFilter === 'All' ? 'white' : 'text.secondary',
              borderColor: stageFilter === 'All' ? 'transparent' : 'divider',
              '&:hover': { opacity: 0.85 },
            }}
          />
          {uniqueStages.map(stage => {
            const cfg = getStatusStyles(stage);
            const active = stageFilter === stage;
            return (
              <Chip
                key={stage}
                label={`${stage} (${stageCounts.get(stage) ?? 0})`}
                size="small"
                onClick={() => setStageFilter(active ? 'All' : stage)}
                variant={active ? 'filled' : 'outlined'}
                sx={{
                  fontWeight: 700,
                  fontSize: '0.72rem',
                  bgcolor: active ? cfg.color : 'transparent',
                  color: active ? 'white' : cfg.color,
                  borderColor: active ? 'transparent' : alpha(cfg.color, 0.35),
                  '&:hover': { opacity: 0.85 },
                }}
              />
            );
          })}
        </Box>
      )}

      {/* Filter bar */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          gap: 1.5,
          mb: 3,
          overflowX: 'auto',
          pb: 1,
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        <Select
          value={lifecycleStatusFilter}
          onChange={(e) => setLifecycleStatusFilter(e.target.value)}
          size="small"
          sx={{ minWidth: { xs: '100%', md: 160 }, borderRadius: '10px', bgcolor: 'background.paper' }}
        >
          <MenuItem value="All">All statuses</MenuItem>
          {lifecycleStatuses.map(s => (
            <MenuItem key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</MenuItem>
          ))}
        </Select>

        <Select
          value={tailorFilter}
          onChange={(e) => setTailorFilter(e.target.value)}
          size="small"
          sx={{ minWidth: { xs: '100%', md: 160 }, borderRadius: '10px', bgcolor: 'background.paper' }}
        >
          <MenuItem value="All">All tailors</MenuItem>
          {uniqueTailors.map(([id, name]) => (
            <MenuItem key={id} value={id}>{name}</MenuItem>
          ))}
        </Select>

        <Button
          variant="outlined"
          startIcon={<FileDownloadIcon />}
          sx={{
            borderRadius: '10px',
            px: 2.5,
            textTransform: 'none',
            fontWeight: 600,
            ml: { md: 'auto' },
            borderColor: 'divider',
            color: 'text.secondary',
            '&:hover': { borderColor: 'var(--sf-green)', color: 'var(--sf-green)' },
          }}
        >
          Export
        </Button>
      </Box>

      {/* Mobile cards */}
      <Box sx={{ display: { xs: 'block', md: 'none' } }}>
        {paginatedTasks.length === 0 ? (
          <QueryEmpty
            message={search || stageFilter !== 'All' || lifecycleStatusFilter !== 'All' || tailorFilter !== 'All'
              ? 'No garments match those filters.'
              : 'No active garments on the production floor.'}
            hint={search || stageFilter !== 'All' ? 'Try broadening your filters.' : 'New orders will appear here once production begins.'}
          />
        ) : (
          paginatedTasks.map(task => (
            <TaskMobileCard
              key={task.stageInstanceId}
              task={task}
              onQuickUpdate={() => setQuickUpdateTask(task)}
              onOpenStage={() => setSelectedTask(task)}
              canViewOrder={canViewOrder}
              navigate={navigate}
            />
          ))
        )}
      </Box>

      {/* Desktop table */}
      <Box sx={{ display: { xs: 'none', md: 'block' } }}>
        <TableContainer
          sx={{
            bgcolor: 'background.paper',
            backgroundImage: 'none',
            borderRadius: '16px',
            border: '1px solid',
            borderColor: 'divider',
            overflow: 'hidden',
          }}
        >
          <Table>
            <TableHead sx={{ bgcolor: alpha('#f3f4f6', 0.6) }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: 0.6 }}>Order</TableCell>
                <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: 0.6 }}>Client & garment</TableCell>
                <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: 0.6 }}>Stage</TableCell>
                <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: 0.6 }}>Deadline</TableCell>
                <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: 0.6 }}>Tailor</TableCell>
                <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: 0.6, textAlign: 'right' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedTasks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} sx={{ border: 'none', py: 2 }}>
                    <QueryEmpty
                      message={search || stageFilter !== 'All' || lifecycleStatusFilter !== 'All' || tailorFilter !== 'All'
                        ? 'No garments match those filters.'
                        : 'No active garments on the production floor.'}
                      hint={search || stageFilter !== 'All' ? 'Try broadening your filters.' : 'New orders will appear here once production begins.'}
                    />
                  </TableCell>
                </TableRow>
              ) : paginatedTasks.map(task => {
                const statusStyle = getStatusStyles(task.stageName);
                const atRisk = isAtRisk(task);
                return (
                  <TableRow
                    key={task.stageInstanceId}
                    hover
                    sx={{ '&:hover': { bgcolor: alpha('#1e5c3a', 0.015) }, transition: 'background-color 0.15s ease' }}
                  >
                    <TableCell>
                      <Link to={`/orders/${task.orderId}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Box sx={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, bgcolor: atRisk ? 'error.main' : alpha('#1e5c3a', 0.6) }} />
                        <Typography variant="body2" sx={{ fontWeight: 800, color: 'text.primary' }}>
                          #{task.orderNumber}
                        </Typography>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Avatar
                          src={task.fabric_image_base64}
                          variant="rounded"
                          sx={{ width: 36, height: 36, borderRadius: '8px', bgcolor: stringToColor(task.garmentName ?? 'G') }}
                        >
                          {task.garmentName?.charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.2 }}>{task.customerName}</Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>{task.garmentName}</Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={task.stageName}
                        size="small"
                        sx={{ fontWeight: 700, color: statusStyle.color, bgcolor: statusStyle.bgColor, borderRadius: '6px', px: 0.25, fontSize: '0.75rem' }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: atRisk ? 'error.main' : 'text.primary' }}>
                        {formatTableDate(task.deadline)}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                        Started {formatTableDate(task.startDate)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {task.tailorEmail ? (
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Avatar sx={{ width: 22, height: 22, fontSize: 10, bgcolor: 'primary.main', fontWeight: 700 }}>
                            {task.tailorEmail[0].toUpperCase()}
                          </Avatar>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{tailorLabel(task)}</Typography>
                        </Stack>
                      ) : (
                        <Typography variant="caption" sx={{ color: 'text.disabled', fontStyle: 'italic' }}>Unassigned</Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                        {canViewOrder && (
                          <Tooltip title="View order">
                            <IconButton size="small" aria-label="View order" onClick={() => navigate(`/orders/${task.orderId}`)}>
                              <VisibilityIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="Change garment status">
                          <IconButton size="small" aria-label="Change garment status" onClick={() => setQuickUpdateTask(task)} sx={{ color: 'text.secondary' }}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Work on stage">
                          <IconButton size="small" aria-label="Work on stage" onClick={() => setSelectedTask(task)} sx={{ color: 'secondary.main' }}>
                            <FactoryIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          <Box sx={{ px: 2, display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid', borderColor: 'divider' }}>
            <TablePagination
              rowsPerPageOptions={[10, 25, 50]}
              component="div"
              count={filteredTasks.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              sx={{ border: 'none' }}
            />
          </Box>
        </TableContainer>
      </Box>

      <ExecutionDialog task={selectedTask} onClose={() => setSelectedTask(null)} />
      <QuickUpdateModal task={quickUpdateTask} onClose={() => setQuickUpdateTask(null)} />
    </Box>
  );
}
