import { useMemo, useState } from 'react';
import { Alert, Box, Button, Chip, IconButton, Stack, Tooltip, Typography, alpha } from '@mui/material';
import {
  ArrowUpward as UpIcon,
  ArrowDownward as DownIcon,
  ContentCopy as DuplicateIcon,
  Lock as LockIcon,
} from '@mui/icons-material';
import type { WorkflowNode, WorkflowTemplate } from '../workflow.api';
import { chainGraph, isSystemTemplate, latestGraph, linearOrder, moveStage, orderProblem } from '../stage-order';
import { useDuplicateTemplate, useSaveStageOrder } from '../hooks/useWorkflowTemplates';

interface Props {
  template: WorkflowTemplate;
}

// A template's stages in running order. Owners can move stages up and down on their own straight-line templates;
// a system template is read-only and offers a copy instead.
export function StageSequenceEditor({ template }: Props) {
  const duplicate = useDuplicateTemplate();
  const saveOrder = useSaveStageOrder();
  const [draft, setDraft] = useState<WorkflowNode[] | null>(null);

  const graph = latestGraph(template);
  const linear = useMemo(() => linearOrder(graph), [graph]);
  const saved = linear ?? graph?.nodes ?? [];
  const stages = draft ?? saved;
  const readOnly = isSystemTemplate(template);
  const canReorder = !readOnly && linear !== null && stages.length > 1;
  const problem = draft ? orderProblem(draft) : null;
  const changed = draft !== null && draft.some((n, i) => n.id !== saved[i]?.id);

  const handleSave = async () => {
    if (!draft || problem) return;
    await saveOrder.mutateAsync({ templateId: template.id, graph: chainGraph(draft) });
    setDraft(null);
  };

  return (
    <Box>
      {readOnly && (
        <Alert
          severity="info"
          icon={<LockIcon fontSize="small" />}
          sx={{ mb: 2, borderRadius: '12px', alignItems: 'center' }}
          action={
            <Button
              size="small"
              startIcon={<DuplicateIcon />}
              disabled={duplicate.isPending}
              onClick={() => duplicate.mutate({ templateId: template.id })}
              sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}
            >
              {duplicate.isPending ? 'Copying...' : 'Duplicate to customise'}
            </Button>
          }
        >
          System template, shared by every business, so it can't be edited. Make your own copy to add or move stages.
        </Alert>
      )}

      {stages.length === 0 ? (
        <Typography variant="caption" sx={{ color: 'text.disabled', fontStyle: 'italic', display: 'block', mb: 2 }}>
          No stages yet.
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
                p: 1.25,
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
              <Typography variant="body2" sx={{ fontWeight: 600, flex: 1, minWidth: 0 }}>
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
              {canReorder && (
                <Stack direction="row">
                  <IconButton
                    size="small"
                    aria-label={`Move ${stage.name} up`}
                    disabled={idx === 0 || saveOrder.isPending}
                    onClick={() => setDraft(moveStage(stages, idx, -1))}
                  >
                    <UpIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                  <IconButton
                    size="small"
                    aria-label={`Move ${stage.name} down`}
                    disabled={idx === stages.length - 1 || saveOrder.isPending}
                    onClick={() => setDraft(moveStage(stages, idx, 1))}
                  >
                    <DownIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Stack>
              )}
            </Box>
          ))}
        </Stack>
      )}

      {!readOnly && linear === null && stages.length > 1 && (
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 2 }}>
          This template has stages running in parallel, so its order can't be changed here.
        </Typography>
      )}

      {changed && (
        <Box sx={{ mb: 2 }}>
          {problem && (
            <Alert severity="warning" sx={{ mb: 1, borderRadius: '10px' }}>{problem}</Alert>
          )}
          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Button size="small" onClick={() => setDraft(null)} disabled={saveOrder.isPending} sx={{ color: 'text.secondary' }}>
              Cancel
            </Button>
            <Button
              size="small"
              variant="contained"
              onClick={handleSave}
              disabled={!!problem || saveOrder.isPending}
              sx={{ borderRadius: '10px', fontWeight: 700 }}
            >
              {saveOrder.isPending ? 'Saving...' : 'Save order'}
            </Button>
          </Stack>
        </Box>
      )}
    </Box>
  );
}
