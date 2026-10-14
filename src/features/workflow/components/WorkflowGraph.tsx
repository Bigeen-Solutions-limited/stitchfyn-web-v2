import { useGarmentWorkflow, useReportStageCompletion, useProgressPhotos } from '../hooks/useWorkflowMutation';
import type { StageInstance, WorkflowEdge } from '../workflow.api';
import { MAX_PROGRESS_PHOTOS_PER_STAGE_UI_HINT } from '../progress-photo.api';
import { ProgressPhotoCapture } from './ProgressPhotoCapture';
import { ProgressPhotoThumbnails } from './ProgressPhotoThumbnails';
import { CheckCircle, Lock } from '@mui/icons-material';

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

  if (isLoading) return <div className="p-md text-muted animate-pulse">Syncing Workflow DAG...</div>;
  if (!workflow) return null;

  const { stages, graphDefinition } = workflow;
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
    <div className="workflow-graph sf-card p-lg">
      <div className="flex justify-between items-center mb-xl">
        <h3 className="text-h3">Production Workflow</h3>
        <div className="text-xs text-muted uppercase tracking-wider font-bold">
          High-Fidelity DAG Execution
        </div>
      </div>

      <div className="flex flex-col gap-lg relative">
        {stages.map((stage: StageInstance, index: number) => {
          const isCompleted = stage.status === 'COMPLETED';
          const unlocked = isStageUnlocked(stage);
          
          // In-progress stages can always be worked on; an unlocked stage skipped by an admin override can still be completed.
          const isActionable = stage.status === 'IN_PROGRESS' || (unlocked && !isCompleted);
          const isLocked = !isActionable && !isCompleted && !unlocked;

          const stagePhotos = (progressPhotos ?? []).filter((p) => p.stageId === stage.stageId);

          const isQcCollectionReviewStage = stage.stageId === QC_COLLECTION_REVIEW_STAGE_ID;
          const missingRequiredQcPhoto = isQcCollectionReviewStage && stagePhotos.length === 0;

          return (
            <div key={stage.id} className="relative flex items-start gap-lg">
              {/* Connection Line */}
              {index < stages.length - 1 && (
                <div 
                  className="absolute left-[15px] top-[30px] w-[2px] h-[calc(100%)] bg-sf-border" 
                  style={{ 
                    backgroundColor: isCompleted ? 'var(--sf-success)' : 'var(--sf-border)',
                    zIndex: 0 
                  }}
                />
              )}

              {/* Node Indicator */}
              <div 
                className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                  isActionable ? 'border-primary bg-primary text-white animate-pulse' : 
                  isCompleted ? 'border-success bg-success text-white' : 
                  isLocked ? 'border-sf-border bg-sf-glass text-muted opacity-40' :
                  'border-sf-border bg-sf-glass text-muted'
                }`}
              >
                {isCompleted ? <CheckCircle fontSize="small" /> : isLocked ? <Lock fontSize="small" /> : <span style={{ fontWeight: 'bold' }}>{index + 1}</span>}
              </div>

              {/* Node Content */}
              <div className={`flex-1 p-md rounded-lg border sf-glass transition-all duration-300 ${
                isActionable ? 'border-primary shadow-sm' : 
                isLocked ? 'border-sf-border opacity-40 pointer-events-none' :
                'border-sf-border opacity-80'
              }`}>
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-sm">{stage.stageId.replace('_', ' ').toUpperCase()}</h4>
                    <p className="text-xs text-muted" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {isLocked && <Lock fontSize="inherit" />}
                      {isCompleted ? `Completed at ${new Date(stage.completedAt!).toLocaleTimeString()}` : 
                       isActionable ? 'Active — Ready for specialized work' :
                       isLocked ? 'Locked — Waiting on upstream stages' :
                       'Pending upstream stages'}
                    </p>
                  </div>
                  
                  {isActionable && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                      <button
                        onClick={() => reportCompletion.mutate({ stageId: stage.stageId })}
                        disabled={reportCompletion.isPending || missingRequiredQcPhoto}
                        className="btn btn-accent btn-sm py-1"
                        title={missingRequiredQcPhoto ? 'Add at least one progress photo before completing this stage.' : undefined}
                      >
                        {reportCompletion.isPending ? 'Syncing...' : 'Mark Complete'}
                      </button>
                      {missingRequiredQcPhoto && (
                        <p className="text-xs text-muted" style={{ maxWidth: 200, textAlign: 'right', margin: 0 }}>
                          Add at least one progress photo before completing this stage.
                        </p>
                      )}
                    </div>
                  )}

                  {isCompleted && (
                    <span className="text-success text-xs font-bold uppercase flex items-center gap-1">
                      <CheckCircle fontSize="inherit" /> Ready
                    </span>
                  )}

                  {isLocked && (
                    <span className="text-xs font-bold uppercase flex items-center gap-1" style={{ color: 'var(--sf-border)', letterSpacing: '0.05em' }}>
                      <Lock fontSize="inherit" /> LOCKED
                    </span>
                  )}
                </div>

                {/* Photos: none for locked stages, capture for active ones (up to the limit), read-only once complete. */}
                {!isLocked && (() => {
                  const canCapturePhoto = isActionable && stagePhotos.length < MAX_PROGRESS_PHOTOS_PER_STAGE_UI_HINT;
                  if (stagePhotos.length === 0 && !canCapturePhoto) return null;
                  return (
                    <div>
                      <ProgressPhotoThumbnails photos={stagePhotos} />
                      {canCapturePhoto && <ProgressPhotoCapture garmentId={garmentId} stageId={stage.stageId} />}
                    </div>
                  );
                })()}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
