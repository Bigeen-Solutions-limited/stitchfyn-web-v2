import React from 'react';
import {
  Box,
  Typography,
  Stack,
  Chip,
  Avatar,
  alpha,
  Tooltip,
  LinearProgress,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as PendingIcon,
  Block as BlockedIcon,
  PlayCircle as InProgressIcon,
  Warning as InhibitedIcon,
} from '@mui/icons-material';
import { useGarmentWorkflow, useProgressPhotos } from '../hooks/useWorkflowMutation';
import type { StageInstance } from '../workflow.api';
import { ProgressPhotoThumbnails } from './ProgressPhotoThumbnails';

interface WorkflowStageTimelineProps {
  garmentId: string;
}

function getStageStyle(status: StageInstance['status']) {
  switch (status) {
    case 'COMPLETED':
      return { icon: <CheckCircleIcon sx={{ fontSize: 18 }} />, color: '#16a34a', bg: alpha('#16a34a', 0.08), label: 'Completed' };
    case 'IN_PROGRESS':
      return { icon: <InProgressIcon sx={{ fontSize: 18 }} />, color: '#2563eb', bg: alpha('#2563eb', 0.08), label: 'In Progress' };
    case 'INHIBITED':
      return { icon: <InhibitedIcon sx={{ fontSize: 18 }} />, color: '#d97706', bg: alpha('#d97706', 0.08), label: 'Inhibited' };
    case 'BLOCKED':
      return { icon: <BlockedIcon sx={{ fontSize: 18 }} />, color: '#dc2626', bg: alpha('#dc2626', 0.08), label: 'Blocked' };
    default:
      return { icon: <PendingIcon sx={{ fontSize: 18 }} />, color: '#9ca3af', bg: alpha('#9ca3af', 0.08), label: 'Pending' };
  }
}

export const WorkflowStageTimeline: React.FC<WorkflowStageTimelineProps> = ({ garmentId }) => {
  const { data: workflow, isLoading } = useGarmentWorkflow(garmentId);
  // Staff Progress-Photo Capture UI — read-only here (no capture action;
  // that belongs to WorkflowGraph). Photos must remain visible on this tab
  // too so they don't appear to "disappear" when switching from DAG View.
  const { data: progressPhotos } = useProgressPhotos(garmentId);

  if (isLoading) {
    return (
      <Box sx={{ py: 2 }}>
        <LinearProgress sx={{ borderRadius: 4, height: 3 }} />
        <Typography variant="caption" sx={{ color: 'text.disabled', mt: 1, display: 'block' }}>
          Loading stage history...
        </Typography>
      </Box>
    );
  }

  if (!workflow || workflow.stages.length === 0) {
    return (
      <Typography variant="caption" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
        No workflow stages recorded for this garment.
      </Typography>
    );
  }

  const { stages, graphDefinition } = workflow;

  // Build ordered stage list using graphDefinition nodes order, falling back to stages array
  const orderedNodes = graphDefinition?.nodes ?? [];
  const orderedStages = orderedNodes.length > 0
    ? orderedNodes
        .map((node) => stages.find((s) => s.stageId === node.id))
        .filter(Boolean) as StageInstance[]
    : stages;

  const completedCount = stages.filter((s) => s.status === 'COMPLETED').length;
  const progressPct = stages.length > 0 ? Math.round((completedCount / stages.length) * 100) : 0;

  return (
    <Box>
      {/* Progress bar */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
        <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Stage Progress
        </Typography>
        <Typography variant="caption" sx={{ fontWeight: 800, color: completedCount === stages.length ? '#16a34a' : 'text.secondary' }}>
          {completedCount}/{stages.length} completed
        </Typography>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={progressPct}
        sx={{
          mb: 3,
          height: 6,
          borderRadius: 4,
          bgcolor: alpha('#1e5c3a', 0.08),
          '& .MuiLinearProgress-bar': { bgcolor: completedCount === stages.length ? '#16a34a' : '#1e5c3a', borderRadius: 4 },
        }}
      />

      {/* Stage list */}
      <Stack spacing={0}>
        {orderedStages.map((stage, idx) => {
          const nodeInfo = graphDefinition?.nodes.find((n) => n.id === stage.stageId);
          const style = getStageStyle(stage.status);
          const isLast = idx === orderedStages.length - 1;

          return (
            <Box key={stage.id} sx={{ display: 'flex', position: 'relative', pb: isLast ? 0 : 3 }}>
              {!isLast && (
                <Box sx={{
                  position: 'absolute',
                  left: 15,
                  top: 32,
                  bottom: 0,
                  width: 2,
                  bgcolor: stage.status === 'COMPLETED' ? alpha('#16a34a', 0.3) : 'divider',
                  zIndex: 0,
                }} />
              )}

              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  bgcolor: style.bg,
                  color: style.color,
                  zIndex: 1,
                  mr: 1.5,
                  flexShrink: 0,
                  border: '1px solid',
                  borderColor: alpha(style.color, 0.3),
                }}
              >
                {style.icon}
              </Avatar>

              <Box sx={{ flex: 1, minWidth: 0, pt: 0.25 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: stage.status === 'PENDING' ? 'text.disabled' : 'text.primary' }}>
                    {nodeInfo?.name ?? `Stage ${idx + 1}`}
                  </Typography>
                  <Chip
                    label={style.label}
                    size="small"
                    sx={{
                      height: 18,
                      fontSize: '9px',
                      fontWeight: 800,
                      borderRadius: '4px',
                      bgcolor: style.bg,
                      color: style.color,
                      flexShrink: 0,
                    }}
                  />
                </Stack>

                <Stack direction="row" spacing={2} sx={{ mt: 0.5 }} flexWrap="wrap">
                  {nodeInfo?.estimated_duration_hours && (
                    <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '10px' }}>
                      Est. {nodeInfo.estimated_duration_hours}h
                    </Typography>
                  )}
                  {stage.startedAt && (
                    <Tooltip title={`Started: ${new Date(stage.startedAt).toLocaleString()}`} placement="top">
                      <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '10px' }}>
                        Started {new Date(stage.startedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </Typography>
                    </Tooltip>
                  )}
                  {stage.completedAt && (
                    <Tooltip title={`Completed: ${new Date(stage.completedAt).toLocaleString()}`} placement="top">
                      <Typography variant="caption" sx={{ color: '#16a34a', fontWeight: 700, fontSize: '10px' }}>
                        Done {new Date(stage.completedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </Typography>
                    </Tooltip>
                  )}
                  {stage.completedBy && (
                    <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '10px' }}>
                      by {stage.completedBy.split('@')[0]}
                    </Typography>
                  )}
                </Stack>

                {/* Staff Progress-Photo Capture UI — read-only display.
                    Shown for stages that have been reached (IN_PROGRESS,
                    INHIBITED — started but currently flagged, COMPLETED);
                    PENDING/BLOCKED (not yet active) show nothing, matching
                    WorkflowGraph's own locked-stage rule. */}
                {(stage.status === 'IN_PROGRESS' || stage.status === 'INHIBITED' || stage.status === 'COMPLETED') && (() => {
                  const stagePhotos = (progressPhotos ?? []).filter((p) => p.stageId === stage.stageId);
                  return <ProgressPhotoThumbnails photos={stagePhotos} />;
                })()}
              </Box>
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
};
