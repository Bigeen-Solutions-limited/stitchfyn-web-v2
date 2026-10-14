import { useState } from 'react';
import {
  Box,
  Typography,
  Stack,
  Button,
  Chip,
  TextField,
  CircularProgress,
  Alert,
  alpha,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Collapse,
} from '@mui/material';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import HourglassEmptyOutlinedIcon from '@mui/icons-material/HourglassEmptyOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import AddCircleOutlineOutlinedIcon from '@mui/icons-material/AddCircleOutlineOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { designBriefApi, type BriefType } from '../design-brief.api';

interface DesignBriefPanelProps {
  orderId: string;
  garmentId: string;
  garmentTier: 'STANDARD' | 'COMPLEX' | 'BESPOKE';
}

interface BriefFormState {
  silhouette: string;
  neckline: string;
  waistDetail: string;
  backFinish: string;
  additionalNotes: string;
}

const EMPTY_FORM: BriefFormState = {
  silhouette: '',
  neckline: '',
  waistDetail: '',
  backFinish: '',
  additionalNotes: '',
};

function BriefFields({
  form,
  onChange,
  disabled,
}: {
  form: BriefFormState;
  onChange: (field: keyof BriefFormState, value: string) => void;
  disabled?: boolean;
}) {
  const sx = { '& .MuiOutlinedInput-root': { borderRadius: 2 } };
  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          fullWidth size="small" label="Silhouette"
          placeholder="e.g. mermaid, A-line, straight"
          value={form.silhouette} disabled={disabled}
          onChange={(e) => onChange('silhouette', e.target.value)} sx={sx}
        />
        <TextField
          fullWidth size="small" label="Neckline"
          placeholder="e.g. sweetheart, round, V-neck"
          value={form.neckline} disabled={disabled}
          onChange={(e) => onChange('neckline', e.target.value)} sx={sx}
        />
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          fullWidth size="small" label="Waist Detail"
          value={form.waistDetail} disabled={disabled}
          onChange={(e) => onChange('waistDetail', e.target.value)} sx={sx}
        />
        <TextField
          fullWidth size="small" label="Back Finish"
          value={form.backFinish} disabled={disabled}
          onChange={(e) => onChange('backFinish', e.target.value)} sx={sx}
        />
      </Stack>
      <TextField
        fullWidth size="small" label="Additional Notes" multiline minRows={3}
        value={form.additionalNotes} disabled={disabled}
        onChange={(e) => onChange('additionalNotes', e.target.value)} sx={sx}
      />
    </Stack>
  );
}

function BriefReadOnly({ brief }: { brief: ReturnType<typeof designBriefApi.getBrief> extends Promise<infer T> ? T : never }) {
  const isConfirmed = !!brief.confirmedByCustomerAt;
  const isBespoke = brief.briefType === 'technical';

  return (
    <Box>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
        {isConfirmed ? (
          <Chip
            icon={<CheckCircleOutlinedIcon sx={{ fontSize: 14 }} />}
            label="Design agreed"
            size="small"
            sx={{
              fontWeight: 800, fontSize: '11px', borderRadius: '6px',
              bgcolor: 'rgba(39, 174, 96, 0.1)', color: '#1a7a42',
              border: '1px solid rgba(39, 174, 96, 0.25)',
              '& .MuiChip-icon': { color: '#1a7a42' },
            }}
          />
        ) : (
          <Chip
            icon={<HourglassEmptyOutlinedIcon sx={{ fontSize: 14 }} />}
            label="Awaiting customer confirmation"
            size="small"
            sx={{
              fontWeight: 800, fontSize: '11px', borderRadius: '6px',
              bgcolor: 'rgba(196, 154, 26, 0.1)', color: '#8a6d1a',
              border: '1px solid rgba(196, 154, 26, 0.25)',
              '& .MuiChip-icon': { color: '#8a6d1a' },
            }}
          />
        )}
        {isConfirmed && <LockOutlinedIcon sx={{ fontSize: 14, color: 'text.disabled' }} />}
      </Stack>

      <Box
        sx={{
          p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider',
          bgcolor: isConfirmed ? alpha('#f8f7f4', 0.8) : 'background.paper',
        }}
      >
        <Stack spacing={1.5}>
          {[
            ['Silhouette', brief.silhouette],
            ['Neckline', brief.neckline],
            ['Waist Detail', brief.waistDetail],
            ['Back Finish', brief.backFinish],
          ].map(([label, value]) => value ? (
            <Box key={label as string}>
              <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.disabled', textTransform: 'uppercase', fontSize: '10px' }}>
                {label}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>{value}</Typography>
            </Box>
          ) : null)}
          {brief.additionalNotes && (
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.disabled', textTransform: 'uppercase', fontSize: '10px' }}>
                Additional Notes
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', whiteSpace: 'pre-line' }}>{brief.additionalNotes}</Typography>
            </Box>
          )}
        </Stack>
      </Box>

      {isBespoke && brief.sectionVersions.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.disabled', textTransform: 'uppercase', fontSize: '10px', letterSpacing: 1, mb: 1, display: 'block' }}>
            Detail Log
          </Typography>
          {brief.sectionVersions.map((sv) => (
            <Accordion key={sv.id} disableGutters elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '8px !important', mb: 0.75, '&:before': { display: 'none' } }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ fontSize: 16 }} />} sx={{ minHeight: 40, py: 0 }}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.disabled', fontFamily: 'monospace' }}>
                    v{sv.versionNumber}
                  </Typography>
                  <Typography variant="caption" sx={{ fontWeight: 700 }}>{sv.content.label}</Typography>
                  <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                    {new Date(sv.appendedAt).toLocaleDateString('en-NG')}
                  </Typography>
                </Stack>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 0, pb: 1.5 }}>
                <Typography variant="body2" sx={{ color: 'text.secondary', whiteSpace: 'pre-line' }}>{sv.content.notes}</Typography>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      )}
    </Box>
  );
}

function AddSectionForm({ orderId, garmentId, onSuccess }: { orderId: string; garmentId: string; onSuccess: () => void }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [notes, setNotes] = useState('');

  const mutation = useMutation({
    mutationFn: () => designBriefApi.addSection(orderId, garmentId, { label: label.trim(), notes: notes.trim() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['design-brief', orderId, garmentId] });
      queryClient.invalidateQueries({ queryKey: ['orders', orderId] });
      setOpen(false);
      setLabel('');
      setNotes('');
      onSuccess();
    },
  });

  return (
    <Box sx={{ mt: 1.5 }}>
      <Button
        size="small"
        variant="outlined"
        startIcon={<AddCircleOutlineOutlinedIcon />}
        onClick={() => setOpen((v) => !v)}
        sx={{
          borderRadius: 2, fontWeight: 700, fontSize: '11px', textTransform: 'none',
          borderColor: alpha('#1e5c3a', 0.4), color: '#1e5c3a',
          '&:hover': { borderColor: '#1e5c3a', bgcolor: alpha('#1e5c3a', 0.04) },
        }}
      >
        Add detail
      </Button>
      <Collapse in={open} unmountOnExit>
        <Box sx={{ mt: 1.5, p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: alpha('#f8f7f4', 0.6) }}>
          <Stack spacing={1.5}>
            <TextField
              fullWidth size="small" label="Detail label"
              placeholder="e.g. Sleeve adjustment, Hem note"
              value={label} onChange={(e) => setLabel(e.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
            <TextField
              fullWidth size="small" label="Notes" multiline minRows={2}
              value={notes} onChange={(e) => setNotes(e.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
            {mutation.isError && (
              <Alert severity="error" sx={{ borderRadius: 2 }}>Failed to add detail. Please try again.</Alert>
            )}
            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button size="small" onClick={() => setOpen(false)} sx={{ fontWeight: 700, textTransform: 'none' }}>Cancel</Button>
              <Button
                size="small" variant="contained"
                disabled={!label.trim() || !notes.trim() || mutation.isPending}
                onClick={() => mutation.mutate()}
                sx={{ borderRadius: 2, fontWeight: 700, textTransform: 'none', bgcolor: '#1e5c3a', '&:hover': { bgcolor: '#256b45' } }}
              >
                {mutation.isPending ? <CircularProgress size={14} sx={{ color: 'white' }} /> : 'Save detail'}
              </Button>
            </Stack>
          </Stack>
        </Box>
      </Collapse>
    </Box>
  );
}

export function DesignBriefPanel({ orderId, garmentId, garmentTier }: DesignBriefPanelProps) {
  const queryClient = useQueryClient();
  const briefType: BriefType = garmentTier === 'BESPOKE' ? 'technical' : 'basic';
  const isBespoke = garmentTier === 'BESPOKE';

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<BriefFormState>(EMPTY_FORM);

  const { data: brief, isLoading, error } = useQuery({
    queryKey: ['design-brief', orderId, garmentId],
    queryFn: () => designBriefApi.getBrief(orderId, garmentId),
    retry: (failureCount, err: any) => {
      // A 404 just means there is no brief yet, so don't retry it
      if (err?.response?.status === 404) return false;
      return failureCount < 2;
    },
  });

  const is404 = (error as any)?.response?.status === 404;

  const createMutation = useMutation({
    mutationFn: () =>
      designBriefApi.createBrief(orderId, garmentId, {
        brief_type: briefType,
        silhouette: form.silhouette.trim() || undefined,
        neckline: form.neckline.trim() || undefined,
        waist_detail: form.waistDetail.trim() || undefined,
        back_finish: form.backFinish.trim() || undefined,
        additional_notes: form.additionalNotes.trim() || undefined,
        reference_image_ids: [],
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['design-brief', orderId, garmentId] });
      queryClient.invalidateQueries({ queryKey: ['orders', orderId] });
      setDialogOpen(false);
      setForm(EMPTY_FORM);
    },
  });

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
        <CircularProgress size={20} />
      </Box>
    );
  }

  if (!brief || is404) {
    return (
      <Box sx={{ pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: 1 }}>
            Design Brief
          </Typography>
          <Button
            size="small"
            variant="outlined"
            startIcon={<DescriptionOutlinedIcon />}
            onClick={() => setDialogOpen(true)}
            sx={{
              borderRadius: 2, fontWeight: 700, fontSize: '11px', textTransform: 'none',
              borderColor: alpha('#1e5c3a', 0.4), color: '#1e5c3a',
              '&:hover': { borderColor: '#1e5c3a', bgcolor: alpha('#1e5c3a', 0.04) },
            }}
          >
            Create Design Brief
          </Button>
        </Stack>
        <Typography variant="caption" sx={{ color: 'text.disabled', fontStyle: 'italic', mt: 0.5, display: 'block' }}>
          No design brief yet
        </Typography>

        <Dialog
          open={dialogOpen}
          onClose={() => !createMutation.isPending && setDialogOpen(false)}
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
                <DescriptionOutlinedIcon sx={{ fontSize: 20, color: '#1e5c3a' }} />
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                  {isBespoke ? 'Technical Brief' : 'Design Brief'}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {isBespoke ? 'Bespoke — detailed specification' : 'Standard construction brief'}
                </Typography>
              </Box>
            </Stack>
          </DialogTitle>
          <DialogContent dividers sx={{ pt: 2 }}>
            <BriefFields
              form={form}
              onChange={(field, value) => setForm((f) => ({ ...f, [field]: value }))}
            />
            {createMutation.isError && (
              <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
                Failed to create brief. Please try again.
              </Alert>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button
              onClick={() => setDialogOpen(false)}
              disabled={createMutation.isPending}
              sx={{ fontWeight: 700, borderRadius: 2, textTransform: 'none' }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              disabled={createMutation.isPending}
              onClick={() => createMutation.mutate()}
              sx={{ fontWeight: 700, borderRadius: 2, textTransform: 'none', bgcolor: '#1e5c3a', '&:hover': { bgcolor: '#256b45' } }}
            >
              {createMutation.isPending ? <CircularProgress size={16} sx={{ color: 'white' }} /> : 'Create Brief'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  }

  return (
    <Box sx={{ pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
        <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: 1 }}>
          Design Brief
        </Typography>
      </Stack>

      <BriefReadOnly brief={brief} />

      {isBespoke && (
        <AddSectionForm
          orderId={orderId}
          garmentId={garmentId}
          onSuccess={() => {}}
        />
      )}
    </Box>
  );
}
