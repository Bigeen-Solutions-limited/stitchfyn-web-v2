import { useParams } from 'react-router-dom';
import { useCustomerOrder, usePortalStageTimeline } from '../hooks/useCustomerOrder';
import { StageTimelineView } from '../../workflow/components/WorkflowStageTimeline';
import { Timeline, TimelineItem } from '../../../components/timeline/Timeline';
import { RiskBadge } from '../../../components/ui/RiskBadge';
import { StageStepper } from '../../../components/ui/StageStepper';
import { PortalPaymentSummary } from '../../portal/components/PortalPaymentSummary';
import { PortalMessageThread } from '../../portal/components/PortalMessageThread';
import { PortalCollectionSignoff } from '../../portal/components/PortalCollectionSignoff';
import { PortalDesignBriefConfirm } from '../../portal/components/PortalDesignBriefConfirm';
import { PortalFabricConfirm } from '../../portal/components/PortalFabricConfirm';
import { PortalDisputeSurface } from '../../portal/components/PortalDisputeSurface';

export function CustomerOrderPage() {
  const { id } = useParams<{ id: string }>();
  const { data: order, isLoading, error } = useCustomerOrder(id || '');
  // The same stage timeline staff see, with its photos, for each garment
  const { data: garmentTimelines = [] } = usePortalStageTimeline(id || '');

  if (isLoading) return <div className="p-xl text-center">Synchronizing with Workshop Archive...</div>;
  if (error || !order) return <div className="p-xl text-center text-danger">Order Projection Unavailable.</div>;

  return (
    <div className="customer-order-page grid gap-xl animate-fade-in">
      <header className="flex justify-between items-end pb-lg border-b border-glass mb-xl">
        <div>
          <h1 className="text-h1 mb-sm">Order #{order.orderNumber}</h1>
          <p className="text-muted">{order.garmentType} for {order.customerName}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted uppercase mb-xs">Status</p>
          <RiskBadge level={order.riskLevel} />
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-xl">
        <div className="md:col-span-1 grid gap-lg">
          <div className="sf-card sf-glass border-accent">
            <h3 className="text-sm uppercase text-muted mb-md">Estimated Handover</h3>
            <div className="text-h2 text-accent font-bold mb-sm">{order.estimatedCompletion}</div>
            <p className="text-xs text-muted">Target: {order.deadline}</p>
          </div>

          <div className="sf-card">
            <h3 className="text-h3 mb-lg">Production Status</h3>
            <StageStepper 
              totalStages={order.stages.length} 
              currentStage={order.activeStageIndex} 
              status={order.isWarning ? 'WARNING' : 'NORMAL'}
            />
          </div>
        </div>

        <div className="md:col-span-2">
          <div className="sf-card">
            <h3 className="text-h3 mb-lg">Production Timeline</h3>
            {garmentTimelines.length > 0 ? (
              <div className="grid gap-lg">
                {garmentTimelines.map((g) => (
                  <div key={g.garmentId}>
                    {garmentTimelines.length > 1 && <h4 className="text-sm font-bold mb-sm">{g.garmentName}</h4>}
                    <StageTimelineView
                      stages={g.stages.map((st) => ({ ...st, key: `${g.garmentId}-${st.stageId}` }))}
                      photos={g.photos}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <Timeline>
                {order.stages.map((stage, index) => (
                  <TimelineItem 
                    key={stage.id}
                    actor={`Stage ${index + 1} of ${order.stages.length}`}
                    action={
                      <div className="flex justify-between items-center w-full">
                        <span className={stage.isComplete ? 'text-muted line-through' : 'font-bold'}>
                          {stage.name}
                        </span>
                        {stage.isComplete ? (
                          <span className="badge badge-ontrack">Complete</span>
                        ) : stage.isActive ? (
                          <span className="badge badge-warning animate-pulse">In Progress</span>
                        ) : (
                          <span className="text-muted text-xs">Pending</span>
                        )}
                      </div>
                    }
                    timestamp={stage.isComplete ? 'Done' : stage.isActive ? 'Now' : 'Upcoming'}
                  />
                ))}
              </Timeline>
            )}
          </div>
        </div>
      </div>

      {/* Fabric comes before design, matching the activation steps */}
      {order.fabricGarments.map((garment) => (
        <PortalFabricConfirm key={garment.garmentId} portalToken={id || ''} garment={garment} />
      ))}

      {order.designBriefs.map((brief) => (
        <PortalDesignBriefConfirm key={brief.id} portalToken={id || ''} brief={brief} />
      ))}

      <PortalCollectionSignoff portalToken={id || ''} />

      <PortalDisputeSurface portalToken={id || ''} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-xl" style={{ marginTop: 0 }}>
        <PortalPaymentSummary portalToken={id || ''} />
        <PortalMessageThread portalToken={id || ''} />
      </div>
    </div>
  );
}
