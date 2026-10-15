import { useState } from 'react';
import { 
  Box, 
  Typography, 
  Grid, 
  Card, 
  Button, 
  Stack, 
  alpha,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Paper
} from '@mui/material';
import { 
  AccountTree as WorkflowIcon,
  Add as AddIcon,
  Timer as TimerIcon,
  ArrowForward as ArrowIcon,
  Category as GarmentIcon,
  Straighten as RulerIcon
} from '@mui/icons-material';
import { useWorkflowTemplates, useTemplateStages, useAddTemplateStage, useCreateTemplate, useUpdateTemplateMeasurements } from '../hooks/useWorkflowTemplates';

export function WorkshopConfiguration() {
  const { data: templates, isLoading: isLoadingTemplates } = useWorkflowTemplates();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const { data: stages, isLoading: isLoadingStages } = useTemplateStages(selectedTemplateId || undefined);
  const addStageMutation = useAddTemplateStage();
  const createTemplateMutation = useCreateTemplate();
 
  const [isAddStageOpen, setIsAddStageOpen] = useState(false);
  const [isCreateTemplateOpen, setIsCreateTemplateOpen] = useState(false);
  const [newStage, setNewStage] = useState({ name: '', duration: '8' });
  const [newTemplate, setNewTemplate] = useState({ name: '', description: '' });
  const [measurementInput, setMeasurementInput] = useState('');
  const updateMeasurementsMutation = useUpdateTemplateMeasurements();

  const selectedTemplate = templates?.find(t => t.id === selectedTemplateId);

  const handleAddStage = async () => {
    if (!selectedTemplateId || !newStage.name) return;
    await addStageMutation.mutateAsync({
      templateId: selectedTemplateId,
      name: newStage.name,
      duration: parseFloat(newStage.duration)
    });
    setIsAddStageOpen(false);
    setNewStage({ name: '', duration: '8' });
  };
 
  const handleCreateTemplate = async () => {
    if (!newTemplate.name) return;
    await createTemplateMutation.mutateAsync(newTemplate);
    setIsCreateTemplateOpen(false);
    setNewTemplate({ name: '', description: '' });
  };

  const handleAddMeasurement = async () => {
    if (!selectedTemplateId || !measurementInput.trim()) return;
    const currentSpecs = selectedTemplate?.requiredMeasurements || [];
    if (currentSpecs.includes(measurementInput.trim())) return;
    
    await updateMeasurementsMutation.mutateAsync({
      templateId: selectedTemplateId,
      measurements: [...currentSpecs, measurementInput.trim()]
    });
    setMeasurementInput('');
  };

  const handleRemoveMeasurement = async (item: string) => {
    if (!selectedTemplateId) return;
    const currentSpecs = selectedTemplate?.requiredMeasurements || [];
    
    await updateMeasurementsMutation.mutateAsync({
      templateId: selectedTemplateId,
      measurements: currentSpecs.filter(m => m !== item)
    });
  };

  return (
    <Box>
      <header style={{ marginBottom: 32 }}>
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
          <WorkflowIcon color="secondary" sx={{ fontSize: 28 }} />
          <Typography variant="h5" sx={{ fontWeight: 800 }}>Production Blueprints</Typography>
        </Stack>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Define the sequence of production stages and estimated durations for each garment type.
        </Typography>
      </header>

      <Grid container spacing={3}>
        {/* TEMPLATE LIST */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: 'uppercase', color: 'text.secondary', letterSpacing: 1 }}>
              Garment Templates
            </Typography>
            <Button 
              size="small" 
              startIcon={<AddIcon />} 
              onClick={() => setIsCreateTemplateOpen(true)}
              sx={{ minWidth: 0, p: 0.5, borderRadius: '8px', color: 'primary.main', '&:hover': { bgcolor: alpha('#1e5c3a', 0.1) } }}
            >
              New
            </Button>
          </Stack>
          <Stack spacing={1.5}>
            {isLoadingTemplates ? (
              <Typography variant="body2">Loading templates...</Typography>
            ) : (
              templates?.map((template) => (
                <Card 
                  key={template.id}
                  onClick={() => setSelectedTemplateId(template.id)}
                  sx={{ 
                    p: 2, 
                    cursor: 'pointer',
                    borderRadius: '16px',
                    border: '1px solid',
                    borderColor: selectedTemplateId === template.id ? 'primary.main' : 'divider',
                    bgcolor: selectedTemplateId === template.id ? alpha('#1e5c3a', 0.05) : 'background.paper',
                    boxShadow: selectedTemplateId === template.id ? '0 4px 20px rgba(30, 92, 58, 0.08)' : 'none',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      borderColor: 'primary.main',
                      boxShadow: '0 6px 25px rgba(0,0,0,0.05)'
                    }
                  }}
                >
                  <Stack direction="row" spacing={2} alignItems="center">
                    <GarmentIcon sx={{ color: selectedTemplateId === template.id ? 'primary.main' : 'text.disabled' }} />
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{template.name}</Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>
                        {template.id.split('-')[0].toUpperCase()}
                      </Typography>
                    </Box>
                  </Stack>
                </Card>
              ))
            )}
          </Stack>
        </Grid>

        {/* STAGE BUILDER / DETAIL */}
        <Grid size={{ xs: 12, md: 8 }}>
          {selectedTemplateId ? (
            <Card sx={{ 
              p: 3, 
              borderRadius: '24px', 
              boxShadow: '0 10px 40px rgba(0,0,0,0.04)',
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper'
            }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>{selectedTemplate?.name}</Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>PRODUCTION SEQUENCE</Typography>
                </Box>
                <Button 
                  variant="outlined" 
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => setIsAddStageOpen(true)}
                  sx={{ borderRadius: '10px', fontWeight: 700, borderColor: 'primary.light' }}
                >
                  Add Stage
                </Button>
              </Stack>

              <Divider sx={{ mb: 3 }} />

              <Box sx={{ mb: 4 }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                  <RulerIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                  <Typography variant="overline" sx={{ fontWeight: 800, color: 'text.secondary', letterSpacing: 1 }}>
                    Required Measurements
                  </Typography>
                </Stack>
                <Paper 
                  variant="outlined" 
                  sx={{ 
                    p: 2, 
                    borderRadius: '16px', 
                    bgcolor: alpha('#f8fbf9', 0.5),
                    borderStyle: 'dashed'
                  }}
                >
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
                    {(Array.isArray(selectedTemplate?.requiredMeasurements) ? selectedTemplate.requiredMeasurements : []).map((m: string) => (
                      <Chip 
                        key={m} 
                        label={m} 
                        onDelete={() => handleRemoveMeasurement(m)}
                        sx={{ 
                          fontWeight: 700, 
                          borderRadius: '8px',
                          bgcolor: 'white',
                          border: '1px solid',
                          borderColor: 'divider',
                          '& .MuiChip-deleteIcon': { color: 'error.light' }
                        }} 
                      />
                    ))}
                    {(Array.isArray(selectedTemplate?.requiredMeasurements) ? selectedTemplate.requiredMeasurements : []).length === 0 && (
                      <Typography variant="caption" sx={{ color: 'text.disabled', fontStyle: 'italic' }}>
                        No required measurements defined.
                      </Typography>
                    )}
                  </Stack>
                  <Stack direction="row" spacing={1}>
                    <TextField 
                      size="small" 
                      placeholder="Add measurement (e.g. Chest)" 
                      value={measurementInput}
                      onChange={(e) => setMeasurementInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') handleAddMeasurement();
                      }}
                      sx={{ flexGrow: 1, '& .MuiOutlinedInput-root': { borderRadius: '10px', bgcolor: 'white' } }}
                    />
                    <Button 
                      variant="contained" 
                      onClick={handleAddMeasurement}
                      disabled={!measurementInput.trim() || updateMeasurementsMutation.isPending}
                      sx={{ borderRadius: '10px', fontWeight: 700 }}
                    >
                      Add
                    </Button>
                  </Stack>
                </Paper>
              </Box>

              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                <TimerIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                <Typography variant="overline" sx={{ fontWeight: 800, color: 'text.secondary', letterSpacing: 1 }}>
                  Production Sequence
                </Typography>
              </Stack>

              {isLoadingStages ? (
                <Typography variant="body2">Loading stages...</Typography>
              ) : stages && stages.length > 0 ? (
                <List sx={{ position: 'relative' }}>
                  {stages.map((stage, index) => (
                    <Box key={stage.id}>
                      <ListItem sx={{ 
                        p: 2, 
                        bgcolor: 'background.default', 
                        borderRadius: '16px',
                        border: '1px solid',
                        borderColor: 'divider',
                        mb: index < stages.length - 1 ? 3 : 0,
                        position: 'relative',
                        '&:hover': {
                          borderColor: 'primary.light',
                          bgcolor: alpha('#1e5c3a', 0.02)
                        }
                      }}>
                        <ListItemIcon sx={{ minWidth: 40 }}>
                          <Box sx={{ 
                            width: 28, 
                            height: 28, 
                            borderRadius: '50%', 
                            bgcolor: 'primary.main', 
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: '0.75rem'
                          }}>
                            {index + 1}
                          </Box>
                        </ListItemIcon>
                        <ListItemText 
                          disableTypography
                          primary={<Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{stage.name}</Typography>}
                          secondary={
                            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                              <TimerIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                              <Typography variant="caption" color="text.secondary">Est. Duration: {stage.estimatedDurationHours || 0} hours</Typography>
                            </Stack>
                          }
                        />
                      </ListItem>
                      {index < stages.length - 1 && (
                        <Box sx={{ 
                          display: 'flex', 
                          justifyContent: 'center', 
                          my: -1.5, 
                          position: 'relative', 
                          zIndex: 1,
                          color: 'primary.light' 
                        }}>
                          <ArrowIcon sx={{ transform: 'rotate(90deg)', fontSize: 24, opacity: 0.5 }} />
                        </Box>
                      )}
                    </Box>
                  ))}
                </List>
              ) : (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <Typography variant="body2" sx={{ color: 'text.disabled', fontStyle: 'italic' }}>
                    No stages defined for this template yet.
                  </Typography>
                </Box>
              )}
            </Card>
          ) : (
            <Box sx={{ 
              height: '100%', 
              minHeight: 400,
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              border: '2px dashed',
              borderColor: 'divider',
              borderRadius: '24px',
              p: 4,
              textAlign: 'center',
              bgcolor: alpha('#000', 0.01)
            }}>
              <Box>
                <WorkflowIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2, opacity: 0.5 }} />
                <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                  Select a template to view or build its workflow sequence.
                </Typography>
              </Box>
            </Box>
          )}
        </Grid>
      </Grid>

      {/* ADD STAGE DIALOG */}
      <Dialog 
        open={isAddStageOpen} 
        onClose={() => setIsAddStageOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: '24px', p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Add Stage to Sequence</DialogTitle>
        <DialogContent>
          <Box sx={{ py: 1 }}>
            <Stack spacing={2.5}>
              <TextField
                label="Stage Name"
                fullWidth
                size="small"
                value={newStage.name}
                onChange={(e) => setNewStage({ ...newStage, name: e.target.value })}
                autoFocus
                placeholder="e.g. Cutting, Hand Stitching"
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
              />
              <TextField
                label="Estimated Duration (Hours)"
                fullWidth
                size="small"
                value={newStage.duration}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9.]/g, '');
                  if ((val.match(/\./g) || []).length <= 1) {
                    setNewStage({ ...newStage, duration: val });
                  }
                }}
                inputProps={{
                  inputMode: 'decimal',
                  pattern: '[0-9]*\\.?[0-9]*',
                }}
                placeholder="8"
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
              />
            </Stack>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setIsAddStageOpen(false)} sx={{ color: 'text.secondary', fontWeight: 600 }}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleAddStage}
            disabled={!newStage.name || addStageMutation.isPending}
            sx={{ borderRadius: '12px', fontWeight: 700, px: 3 }}
          >
            {addStageMutation.isPending ? 'Adding...' : 'Add Stage'}
          </Button>
        </DialogActions>
      </Dialog>
 
      {/* CREATE TEMPLATE DIALOG */}
      <Dialog 
        open={isCreateTemplateOpen} 
        onClose={() => setIsCreateTemplateOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: '24px', p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Create New Blueprint</DialogTitle>
        <DialogContent>
          <Box sx={{ py: 1 }}>
            <Stack spacing={2.5}>
              <TextField
                label="Template Name"
                fullWidth
                size="small"
                value={newTemplate.name}
                onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                autoFocus
                placeholder="e.g. Standard Tuxedo, Summer Dress"
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
              />
              <TextField
                label="Description"
                fullWidth
                size="small"
                multiline
                rows={3}
                value={newTemplate.description}
                onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                placeholder="Briefly describe what this blueprint is for..."
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
              />
            </Stack>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setIsCreateTemplateOpen(false)} sx={{ color: 'text.secondary', fontWeight: 600 }}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleCreateTemplate}
            disabled={!newTemplate.name || createTemplateMutation.isPending}
            sx={{ borderRadius: '12px', fontWeight: 700, px: 3, bgcolor: '#1e5c3a', '&:hover': { bgcolor: '#2a7a4d' } }}
          >
            {createTemplateMutation.isPending ? 'Creating...' : 'Create Blueprint'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
