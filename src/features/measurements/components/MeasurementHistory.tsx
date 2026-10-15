import { useMeasurements } from '../hooks/useMeasurementMutation';
import { Timeline, TimelineItem } from '../../../components/timeline/Timeline.tsx';

// The shape GET /customers/:id/measurements returns
interface MeasurementVersion {
  id: string;
  versionNumber: number;
  measurements: Record<string, number>;
  status: string;
  isLocked: boolean;
  createdAt: string;
}

export function MeasurementHistory({ customerId }: { customerId: string }) {
  const { data: versions, isLoading } = useMeasurements(customerId);

  if (isLoading) return <div>Synchronizing Measurement Archive...</div>;

  const list = (versions as unknown as MeasurementVersion[] | undefined) ?? [];

  return (
    <div className="measurement-history">
      <h3 className="text-h3 mb-lg">Measurement Version History</h3>
      <Timeline>
        {[...list].reverse().map((v) => (
          <TimelineItem
            key={v.id}
            actor={`Version ${v.versionNumber}${v.isLocked ? ' · locked' : ''}`}
            action={`${Object.keys(v.measurements ?? {}).length} measurement points (${v.status})`}
            timestamp={new Date(v.createdAt).toLocaleString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          />
        ))}
        {list.length === 0 && <p className="text-muted text-sm">No measurements recorded yet.</p>}
      </Timeline>
    </div>
  );
}
