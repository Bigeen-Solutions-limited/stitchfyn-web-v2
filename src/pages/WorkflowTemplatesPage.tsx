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
  Divider,
  IconButton,
  Tooltip,
  Collapse,
} from '@mui/material';
import {
  AccountTree as WorkflowIcon,
  Add as AddIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  AccessTime as DurationIcon,
  Straighten as MeasureIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import {
  useWorkflowTemplates,
  useCreateTemplate,
  useTemplateStages,
  useAddTemplateStage,
  useUpdateTemplateMeasurements,
} from '../features/workflow/hooks/useWorkflowTemplates';
import type { WorkflowTemplate } from '../features/workflow/workflow.api';

interface StagePanelProps {
  template: WorkflowTemplate;
}

const StagePanel: React.FC<StagePanelProps> = ({ template }) => {
  const { data: stages = [], isLoading } = useTemplateStages(template.id);
  const addStage = useAddTemplateStage();
  const updateMeasurements = useUpdateTemplateMeasurements();

  const [stageForm, setStageForm] = useState({ name: '', duration: '' });
  const [measForm, setMeasForm] = useState(template.requiredMeasurements.join(', '));
  const [showMeasEdit, setShowMeasEdit] = useState(false);

  const handleAddStage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stageForm.name.trim()) return;
    await addStage.mutateAsync({
      templateId: template.id,
      name: stageForm.name.trim(),
      duration: parseFloat(stageForm.duration) || 0,
    });
    setStageForm({ name: '', duration: '' });
  };

  const handleSaveMeasurements = async () => {
    const parsed = measForm
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    await updateMeasurements.mutateAsync({ templateId: template.id, measurements: parsed });
    setShowMeasEdit(false);
  };

  return (
    <Box sx={{ pt: 2 }}>
      {/* Required measurements */}
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
        <MeasureIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
        <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', color: 'text.secondary' }}>
          Required Measurements
        </Typography>
        <IconButton size="small" onClick={() => setShowMeasEdit(!showMeasEdit)} sx={{ ml: 'auto' }}>
          <EditIcon sx={{ fontSize: 14 }} />
        </IconButton>
      </Stack>

      {showMeasEdit ? (
        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
          <TextField
            size="small"
            value={measForm}
            onChange={(e) => setMeasForm(e.target.value)}
            placeholder="chest, waist, shoulder..."
            fullWidth
            InputProps={{ sx: { borderRadius: '10px', fontSize: '12px' } }}
            helperText="Comma-separated measurement field names"
          />
          <Button
            size="small"
            variant="contained"
            onClick={handleSaveMeasurements}
            disabled={updateMeasurements.isPending}
            sx={{ borderRadius: '10px', fontWeight: 700, px: 2, flexShrink: 0 }}
          >
            Save
          </Button>
        </Stack>
      ) : (
        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
          {template.requiredMeasurements.length > 0
            ? template.requiredMeasurements.map((m) => (
                <Chip key={m} label={m} size="small" sx={{ height: 20, fontSize: '10px', fontWeight: 700, bgcolor: alpha('#1e5c3a', 0.07), color: '#1e5c3a', borderRadius: '4px' }} />
              ))
            : <Typography variant="caption" sx={{ color: 'text.disabled', fontStyle: 'italic' }}>No measurements defined</Typography>}
        </Stack>
      )}

      <Divider sx={{ mb: 2 }} />

      {/* Stage list */}
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
        <DurationIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
        <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', color: 'text.secondary' }}>
          Production Stages ({stages.length})
        </Typography>
      </Stack>

      {isLoading ? (
        <Stack spacing={1}>
          {[1, 2, 3].map((i) => <Skeleton key={i} height={32} sx={{ borderRadius: '8px' }} />)}
        </Stack>
      ) : stages.length === 0 ? (
        <Typography variant="caption" sx={{ color: 'text.disabled', fontStyle: 'italic', display: 'block', mb: 2 }}>
          No stages yet. Add the first production stage below.
        </Typography>
      ) : (
        <Stack spacing={0.5} sx={{ mb: 2 }}>
          {stages.map((stage, idx) => (
            <Box
              key={stage.id}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                p: 1.5,
                bgcolor: alpha('#1e5c3a', 0.03),
                borderRadius: '10px',
                border: '1px solid',
                borderColor: alpha('#1e5c3a', 0.1),
              }}
            >
              <Box
                sx={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  bgcolor: alpha('#1e5c3a', 0.12),
                  color: '#1e5c3a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '10px',
                  fontWeight: 800,
                  flexShrink: 0,
                }}
              >
                {idx + 1}
              </Box>
              <Typography variant="body2" sx={{ fontWeight: 600, flex: 1 }}>
                {stage.name}
              </Typography>
              {stage.estimatedDurationHours != null && (
                <Tooltip title="Estimated duration">
                  <Chip
                    label={`${stage.estimatedDurationHours}h`}
                    size="small"
                    sx={{ height: 18, fontSize: '9px', fontWeight: 800, bgcolor: alpha('#2563eb', 0.07), color: '#2563eb', borderRadius: '4px' }}
                  />
                </Tooltip>
              )}
            </Box>
          ))}
        </Stack>
      )}

      {/* Add stage form */}
      <form onSubmit={handleAddStage}>
        <Stack direction="row" spacing={1}>
          <TextField
            size="small"
            placeholder="Stage name (e.g. Cutting)"
            value={stageForm.name}
            onChange={(e) => setStageForm((p) => ({ ...p, name: e.target.value }))}
            required
            sx={{ flex: 1 }}
            InputProps={{ sx: { borderRadius: '10px', fontSize: '12px' } }}
          />
          <TextField
            size="small"
            type="number"
            placeholder="Hours"
            value={stageForm.duration}
            onChange={(e) => setStageForm((p) => ({ ...p, duration: e.target.value }))}
            sx={{ width: 80 }}
            InputProps={{ sx: { borderRadius: '10px', fontSize: '12px' } }}
          />
          <Button
            type="submit"
            size="small"
            variant="outlined"
            disabled={addStage.isPending}
            sx={{ borderRadius: '10px', fontWeight: 700, px: 2, borderColor: alpha('#1e5c3a', 0.3), color: '#1e5c3a', flexShrink: 0 }}
          >
            Add Stage
          </Button>
        </Stack>
      </form>
    </Box>
  );
};

const TemplateCard: React.FC<{ template: WorkflowTemplate }> = ({ template }) => {
  const [expanded, setExpanded] = useState(false);

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
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#1a2340', mb: 0.5 }}>
            {template.name}
          </Typography>
          {template.description && (
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {template.description}
            </Typography>
          )}
        </Box>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0, ml: 2 }}>
          <Chip
            label={`${template.requiredMeasurements.length} measurements`}
            size="small"
            sx={{ height: 20, fontSize: '9px', fontWeight: 700, bgcolor: alpha('#1e5c3a', 0.08), color: '#1e5c3a', borderRadius: '4px' }}
          />
          <IconButton
            size="small"
            onClick={() => setExpanded(!expanded)}
            sx={{ color: 'text.secondary' }}
          >
            {expanded ? <CollapseIcon sx={{ fontSize: 18 }} /> : <ExpandIcon sx={{ fontSize: 18 }} />}
          </IconButton>
        </Stack>
      </Stack>

      <Collapse in={expanded}>
        <StagePanel template={template} />
      </Collapse>
    </Card>
  );
};

interface CreateDialogProps {
  open: boolean;
  onClose: () => void;
}

const CreateTemplateDialog: React.FC<CreateDialogProps> = ({ open, onClose }) => {
  const createTemplate = useCreateTemplate();
  const [form, setForm] = useState({ name: '', description: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createTemplate.mutateAsync({ name: form.name.trim(), description: form.description.trim() });
    setForm({ name: '', description: '' });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: '24px', p: 1 } }}>
      <form onSubmit={handleSubmit}>
        <DialogTitle sx={{ fontWeight: 800 }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <WorkflowIcon sx={{ color: 'primary.main', fontSize: 22 }} />
            <span>New Workflow Blueprint</span>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            <TextField
              label="Template Name"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              required
              fullWidth
              size="small"
              placeholder="e.g. Wedding Suit, Evening Gown..."
              InputProps={{ sx: { borderRadius: '12px' } }}
            />
            <TextField
              label="Description (optional)"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              fullWidth
              multiline
              rows={2}
              size="small"
              placeholder="Intended garment type or use-case..."
              InputProps={{ sx: { borderRadius: '12px' } }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button onClick={onClose} sx={{ color: 'text.secondary', borderRadius: '10px' }}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={createTemplate.isPending} sx={{ borderRadius: '10px', fontWeight: 700, px: 3 }}>
            {createTemplate.isPending ? 'Creating...' : 'Create Blueprint'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export const WorkflowTemplatesPage: React.FC = () => {
  const { data: templates = [], isLoading } = useWorkflowTemplates();
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <Box className="container" sx={{ py: 4 }}>
      <header style={{ marginBottom: 32 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" spacing={2} alignItems="center">
            <WorkflowIcon sx={{ fontSize: 32, color: 'primary.main' }} />
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 800, fontSize: { xs: '1.25rem', md: '2.125rem' } }}>
                Workflow Templates
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                Define production blueprints. Each template encodes the DAG of stages required for a garment type.
              </Typography>
            </Box>
          </Stack>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateOpen(true)}
            sx={{ borderRadius: '12px', fontWeight: 700, textTransform: 'none', flexShrink: 0, display: { xs: 'none', sm: 'flex' } }}
          >
            New Blueprint
          </Button>
        </Stack>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateOpen(true)}
          fullWidth
          sx={{ borderRadius: '12px', fontWeight: 700, textTransform: 'none', mt: 2, display: { xs: 'flex', sm: 'none' } }}
        >
          New Blueprint
        </Button>
      </header>

      {isLoading ? (
        <Stack spacing={2}>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} variant="rectangular" height={80} sx={{ borderRadius: '20px' }} />
          ))}
        </Stack>
      ) : templates.length === 0 ? (
        <Card
          className="sf-glass"
          sx={{ p: 6, borderRadius: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '35vh', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.4)' }}
        >
          <WorkflowIcon sx={{ fontSize: 48, color: alpha('#1e5c3a', 0.2), mb: 2 }} />
          <Typography variant="body1" sx={{ fontWeight: 700, color: '#374151', mb: 1 }}>No blueprints defined</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3, textAlign: 'center', maxWidth: 400 }}>
            Workflow templates define the production stages for each garment type. Create the first blueprint to activate the DAG engine.
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)} sx={{ borderRadius: '12px', fontWeight: 700, textTransform: 'none' }}>
            Create First Blueprint
          </Button>
        </Card>
      ) : (
        <Stack spacing={2}>
          {templates.map((t) => (
            <TemplateCard key={t.id} template={t} />
          ))}
        </Stack>
      )}

      <CreateTemplateDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </Box>
  );
};
