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

export function WorkflowGraph({ garmentId, orderId }: WorkflowGraphProps) {
  const { data: workflow, isLoading } = useGarmentWorkflow(garmentId);
  const reportCompletion = useReportStageCompletion(garmentId, orderId);
  // Staff Progress-Photo Capture UI — one query for the whole garment,
  // filtered per-stage below, rather than one query per row.
  const { data: progressPhotos } = useProgressPhotos(garmentId);

  if (isLoading) return <div className="p-md text-muted animate-pulse">Syncing Workflow DAG...</div>;
  if (!workflow) return null;

  const { stages, graphDefinition } = workflow;
  const edges: WorkflowEdge[] = graphDefinition?.edges || [];

  /**
   * Sequential DAG Enforcement
   * 
   * For each stage, determine if it is "unlocked" (all upstream dependencies
   * have been completed). Root nodes (no incoming edges) are always unlocked.
   */
  const getUpstreamDependencies = (stageId: string): string[] => {
    return edges
      .filter(([, target]) => target === stageId)
      .map(([source]) => source);
  };

  const isStageUnlocked = (stage: StageInstance): boolean => {
    // Robust, fail-safe check for dependencies as per requirements
    // Force it to be an array, handling nulls, undefined, or strings.
    let safeDeps: string[] = [];
    if ('dependencies' in stage) {
       const stageDeps = (stage as any).dependencies;
       let parsedDeps = Array.isArray(stageDeps) 
        ? stageDeps 
        : (stageDeps ? JSON.parse(stageDeps as string) : []);
       safeDeps = parsedDeps.filter((dep: any) => typeof dep === 'string' && dep.trim() !== '');
    } else {
       // Fallback to our existing edges computation
       safeDeps = getUpstreamDependencies(stage.stageId).filter(dep => typeof dep === 'string' && dep.trim() !== '');
    }

    const isRootNode = safeDeps.length === 0;

    // Condition B: All upstream parents must be COMPLETED
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
          
          // An ACTIVE stage is always actionable, preserving backend-driven overrides (like Quick Update).
          // However, if a stage is legally unlocked by the chronological DAG but falls out of ACTIVE state (due to an admin override leapfrogging it), it should still be conditionally actionable to recover completion flow.
          const isActionable = stage.status === 'IN_PROGRESS' || (unlocked && !isCompleted);
          const isLocked = !isActionable && !isCompleted && !unlocked;
          
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
                    <button 
                      onClick={() => reportCompletion.mutate({ stageId: stage.stageId })}
                      disabled={reportCompletion.isPending}
                      className="btn btn-accent btn-sm py-1"
                    >
                      {reportCompletion.isPending ? 'Syncing...' : 'Mark Complete'}
                    </button>
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

                {/* Staff Progress-Photo Capture UI — US-4.3. Locked/
                    not-yet-active stages show nothing here, per the locked
                    product decision. Active stages show existing photos
                    plus the capture control (hidden once the stage already
                    has MAX_PROGRESS_PHOTOS_PER_STAGE_UI_HINT — the backend
                    is the real enforcement). Completed stages retain their
                    photos as historical evidence with no capture action. */}
                {!isLocked && (() => {
                  const stagePhotos = (progressPhotos ?? []).filter((p) => p.stageId === stage.stageId);
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
