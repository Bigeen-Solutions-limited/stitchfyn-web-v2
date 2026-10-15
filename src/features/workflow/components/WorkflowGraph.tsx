import { useGarmentWorkflow, useReportStageCompletion, useProgressPhotos } from '../hooks/useWorkflowMutation';
import type { StageInstance, WorkflowEdge } from '../workflow.api';
import { MAX_PROGRESS_PHOTOS_PER_STAGE_UI_HINT } from '../progress-photo.api';
import { ProgressPhotoCapture } from './ProgressPhotoCapture';
import { ProgressPhotoThumbnails } from './ProgressPhotoThumbnails';
import { CheckCircle, Lock } from '@mui/icons-material';
import { Box, Button, Stack, Typography } from '@mui/material';

interface WorkflowGraphProps {
  garmentId: string;
  orderId: string;
}

// The quality check stage needs at least one photo before it can be completed; the server enforces this too.
const QC_COLLECTION_REVIEW_STAGE_ID = 'qc';

export function WorkflowGraph({ garmentId, orderId }: WorkflowGraphProps) {
  const { data: workflow, isLoading } = useGarmentWorkflow(garmentId);
  const reportCompletion = useReportStageCompletion(garmentId, orderId);
  // One request for all of the garment's photos, split by stage below
  const { data: progressPhotos } = useProgressPhotos(garmentId);

  if (isLoading) return <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>Syncing Workflow DAG...</Typography>;
  if (!workflow) return null;

  const { stages: unorderedStages, graphDefinition } = workflow;

  // Order stages as the template does (the API returns them unordered); stages the template doesn't list go last
  const nodeOrder = new Map((graphDefinition?.nodes ?? []).map((node, index) => [node.id, index]));
  const stages = [...unorderedStages].sort(
    (a, b) => (nodeOrder.get(a.stageId) ?? Number.MAX_SAFE_INTEGER) - (nodeOrder.get(b.stageId) ?? Number.MAX_SAFE_INTEGER),
  );
  const edges: WorkflowEdge[] = graphDefinition?.edges || [];

  // A stage is unlocked once every stage before it is complete; the first stages are always unlocked.
  const getUpstreamDependencies = (stageId: string): string[] => {
    return edges
      .filter(([, target]) => target === stageId)
      .map(([source]) => source);
  };

  const isStageUnlocked = (stage: StageInstance): boolean => {
    // The server may send dependencies as null, a string or an array, so normalise to an array
    let safeDeps: string[] = [];
    if ('dependencies' in stage) {
       const stageDeps = (stage as any).dependencies;
       let parsedDeps = Array.isArray(stageDeps) 
        ? stageDeps 
        : (stageDeps ? JSON.parse(stageDeps as string) : []);
       safeDeps = parsedDeps.filter((dep: any) => typeof dep === 'string' && dep.trim() !== '');
    } else {
       safeDeps = getUpstreamDependencies(stage.stageId).filter(dep => typeof dep === 'string' && dep.trim() !== '');
    }

    const isRootNode = safeDeps.length === 0;

    const isUnlocked = isRootNode || safeDeps.every((depId: string) => {
      const depStage = stages.find(s => s.stageId === depId);
      return depStage?.status === 'COMPLETED';
    });

    return isUnlocked;
  };

  return (
    <Box className="workflow-graph" sx={{ p: { xs: 2, md: 3 } }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3, gap: 1, flexWrap: 'wrap' }}>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>Production Workflow</Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
          High-Fidelity DAG Execution
        </Typography>
      </Stack>

      <Stack spacing={2}>
        {stages.map((stage: StageInstance, index: number) => {
          const isCompleted = stage.status === 'COMPLETED';
          const unlocked = isStageUnlocked(stage);

          // In-progress stages can always be worked on; an unlocked stage skipped by an admin override can still be completed.
          const isActionable = stage.status === 'IN_PROGRESS' || (unlocked && !isCompleted);
          const isLocked = !isActionable && !isCompleted && !unlocked;

          const stagePhotos = (progressPhotos ?? []).filter((p) => p.stageId === stage.stageId);

          const isQcCollectionReviewStage = stage.stageId === QC_COLLECTION_REVIEW_STAGE_ID;
          const missingRequiredQcPhoto = isQcCollectionReviewStage && stagePhotos.length === 0;

          const nodeColor = isCompleted ? 'var(--color-success)' : isActionable ? 'var(--color-primary)' : 'var(--sf-border)';

          return (
            <Box key={stage.id} sx={{ position: 'relative', display: 'flex', alignItems: 'flex-start', gap: 2 }}>
              {/* Connection Line */}
              {index < stages.length - 1 && (
                <Box sx={{ position: 'absolute', left: 15, top: 34, bottom: -16, width: 2, bgcolor: isCompleted ? 'var(--color-success)' : 'var(--sf-border)' }} />
              )}

              {/* Node Indicator */}
              <Box
                sx={{
                  position: 'relative', zIndex: 1, flexShrink: 0, width: 32, height: 32, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid', borderColor: nodeColor,
                  bgcolor: isCompleted || isActionable ? nodeColor : 'background.paper',
                  color: isCompleted || isActionable ? '#fff' : 'text.disabled',
                  opacity: isLocked ? 0.5 : 1, fontWeight: 700, fontSize: '0.85rem',
                }}
              >
                {isCompleted ? <CheckCircle fontSize="small" /> : isLocked ? <Lock fontSize="small" /> : index + 1}
              </Box>

              {/* Node Content */}
              <Box sx={{
                flex: 1, minWidth: 0, p: 2, borderRadius: 2, border: '1px solid',
                borderColor: isActionable ? 'var(--color-primary)' : 'var(--sf-border)',
                bgcolor: 'background.paper',
                opacity: isLocked ? 0.5 : isCompleted ? 0.85 : 1,
                pointerEvents: isLocked ? 'none' : undefined,
              }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ gap: 2, flexWrap: 'wrap' }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{stage.stageId.replace('_', ' ').toUpperCase()}</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      {isLocked && <Lock fontSize="inherit" />}
                      {isCompleted ? `Completed at ${new Date(stage.completedAt!).toLocaleTimeString()}` :
                       isActionable ? 'Active — Ready for specialized work' :
                       isLocked ? 'Locked — Waiting on upstream stages' :
                       'Pending upstream stages'}
                    </Typography>
                  </Box>

                  {isActionable && (
                    <Stack alignItems="flex-end" spacing={0.5}>
                      <Button
                        variant="contained"
                        color="secondary"
                        size="small"
                        onClick={() => reportCompletion.mutate({ stageId: stage.stageId })}
                        disabled={reportCompletion.isPending || missingRequiredQcPhoto}
                        title={missingRequiredQcPhoto ? 'Add at least one progress photo before completing this stage.' : undefined}
                        sx={{ borderRadius: '10px', fontWeight: 700, boxShadow: 'none', whiteSpace: 'nowrap' }}
                      >
                        {reportCompletion.isPending ? 'Syncing...' : 'Mark Complete'}
                      </Button>
                      {missingRequiredQcPhoto && (
                        <Typography variant="caption" sx={{ color: 'text.secondary', maxWidth: 200, textAlign: 'right' }}>
                          Add at least one progress photo before completing this stage.
                        </Typography>
                      )}
                    </Stack>
                  )}

                  {isCompleted && (
                    <Typography variant="caption" sx={{ color: 'var(--color-success)', fontWeight: 800, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <CheckCircle fontSize="inherit" /> Ready
                    </Typography>
                  )}

                  {isLocked && (
                    <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Lock fontSize="inherit" /> LOCKED
                    </Typography>
                  )}
                </Stack>

                {/* Photos: none for locked stages, capture for active ones (up to the limit), read-only once complete. */}
                {!isLocked && (() => {
                  const canCapturePhoto = isActionable && stagePhotos.length < MAX_PROGRESS_PHOTOS_PER_STAGE_UI_HINT;
                  if (stagePhotos.length === 0 && !canCapturePhoto) return null;
                  return (
                    <Box sx={{ mt: 1.5 }}>
                      <ProgressPhotoThumbnails photos={stagePhotos} />
                      {canCapturePhoto && <ProgressPhotoCapture garmentId={garmentId} stageId={stage.stageId} />}
                    </Box>
                  );
                })()}
              </Box>
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
}
