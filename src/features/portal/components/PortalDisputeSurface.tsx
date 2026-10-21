import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { portalDisputeApi, type DisputeCategory } from '../../dispute/dispute.api';
import { CheckCircleRounded as CheckIcon, WarningAmberRounded as WarningIcon } from '@mui/icons-material';

interface Props {
  portalToken: string;
}

const CATEGORIES: DisputeCategory[] = ['MATERIAL', 'MEASUREMENT', 'FINANCIAL', 'AESTHETIC'];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

const btnStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '10px 24px',
  borderRadius: 8,
  border: 'none',
  fontWeight: 700,
  fontSize: '0.9rem',
  cursor: 'pointer',
} as const;

function RaiseDisputeForm({ portalToken }: { portalToken: string }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<DisputeCategory>('MATERIAL');
  const [severity, setSeverity] = useState<'CRITICAL' | 'WARNING'>('WARNING');
  const [description, setDescription] = useState('');

  const raiseMutation = useMutation({
    mutationFn: () => portalDisputeApi.raiseDispute(portalToken, { category, severity, description }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal', portalToken, 'dispute'] });
      setOpen(false);
      setDescription('');
    },
  });

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{ ...btnStyle, background: 'transparent', color: '#c0392b', border: '1px solid #c0392b' }}
      >
        Report a problem with this order
      </button>
    );
  }

  return (
    <div className="sf-card" style={{ borderTop: '2px solid #c0392b' }}>
      <h3 className="text-h3 mb-lg">Report a problem</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#6b7280' }}>
          Category
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as DisputeCategory)}
            style={{ display: 'block', width: '100%', marginTop: 4, padding: 8, borderRadius: 6, border: '1px solid #ccc' }}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
        <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#6b7280' }}>
          Severity
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value as 'CRITICAL' | 'WARNING')}
            style={{ display: 'block', width: '100%', marginTop: 4, padding: 8, borderRadius: 6, border: '1px solid #ccc' }}
          >
            <option value="WARNING">Warning</option>
            <option value="CRITICAL">Critical</option>
          </select>
        </label>
        <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#6b7280' }}>
          What went wrong?
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            style={{ display: 'block', width: '100%', marginTop: 4, padding: 8, borderRadius: 6, border: '1px solid #ccc', fontFamily: 'inherit' }}
          />
        </label>

        {raiseMutation.isError && (
          <p style={{ color: '#c0392b', fontSize: '0.85rem' }}>Failed to submit. Please try again.</p>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={() => setOpen(false)} style={{ ...btnStyle, background: 'transparent', color: '#6b7280' }}>
            Cancel
          </button>
          <button
            onClick={() => raiseMutation.mutate()}
            disabled={!description.trim() || raiseMutation.isPending}
            style={{
              ...btnStyle,
              background: '#c0392b',
              color: '#fff',
              opacity: !description.trim() || raiseMutation.isPending ? 0.6 : 1,
            }}
          >
            {raiseMutation.isPending ? 'Submitting…' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function PortalDisputeSurface({ portalToken }: Props) {
  const queryClient = useQueryClient();
  const queryKey = ['portal', portalToken, 'dispute'];
  const [evidenceUrl, setEvidenceUrl] = useState('');

  const { data: dispute, isLoading } = useQuery({
    queryKey,
    queryFn: () => portalDisputeApi.getProjection(portalToken),
  });

  const evidenceMutation = useMutation({
    mutationFn: () =>
      portalDisputeApi.submitEvidence(portalToken, dispute!.disputeId, {
        evidenceType: 'PHOTO',
        artifactUrl: evidenceUrl,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setEvidenceUrl('');
    },
  });

  const resolveMutation = useMutation({
    mutationFn: () => portalDisputeApi.resolveMySide(portalToken, dispute!.disputeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  if (isLoading) return null;

  // No active dispute — offer the entry point.
  if (!dispute) {
    return <RaiseDisputeForm portalToken={portalToken} />;
  }

  const isResolved = dispute.status === 'RESOLVED' || dispute.status === 'TERMINATED';

  return (
    <div className="sf-card" style={{ borderTop: `2px solid ${isResolved ? '#1e5c3a' : '#c0392b'}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        {isResolved ? <CheckIcon sx={{ fontSize: 20 }} aria-hidden /> : <WarningIcon sx={{ fontSize: 20 }} aria-hidden />}
        <h3 className="text-h3" style={{ margin: 0 }}>
          {isResolved ? 'Dispute resolved' : `Dispute: ${dispute.category}`}
        </h3>
      </div>

      <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: 16 }}>
        Status: {dispute.status.replace('_', ' ')} · Opened {formatDate(dispute.lastActivityAt)}
      </p>

      {!isResolved && dispute.requiredAction === 'UPLOAD_PHOTO' && (
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#6b7280' }}>
            Add evidence (photo URL)
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <input
                value={evidenceUrl}
                onChange={(e) => setEvidenceUrl(e.target.value)}
                placeholder="https://…"
                style={{ flex: 1, padding: 8, borderRadius: 6, border: '1px solid #ccc' }}
              />
              <button
                onClick={() => evidenceMutation.mutate()}
                disabled={!evidenceUrl.trim() || evidenceMutation.isPending}
                style={{
                  ...btnStyle,
                  background: '#c0392b',
                  color: '#fff',
                  opacity: !evidenceUrl.trim() || evidenceMutation.isPending ? 0.6 : 1,
                }}
              >
                {evidenceMutation.isPending ? 'Adding…' : 'Add'}
              </button>
            </div>
          </label>
        </div>
      )}

      {!isResolved && (
        <button
          onClick={() => resolveMutation.mutate()}
          disabled={resolveMutation.isPending}
          style={{
            ...btnStyle,
            background: '#1e5c3a',
            color: '#fff',
            opacity: resolveMutation.isPending ? 0.6 : 1,
          }}
        >
          {resolveMutation.isPending ? 'Confirming…' : "I agree — resolve my side"}
        </button>
      )}

      {resolveMutation.isError && (
        <p style={{ color: '#c0392b', fontSize: '0.85rem', marginTop: 8 }}>
          Failed to confirm. Please try again.
        </p>
      )}
    </div>
  );
}
