import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { portalFabricEvidenceApi } from '../../orders/fabric-evidence.api';
import { portalDisputeApi } from '../../dispute/dispute.api';
import type { CustomerOrderProjection } from '../../customer/customer.api';

interface Props {
  portalToken: string;
  garment: CustomerOrderProjection['fabricGarments'][number];
}

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

/**
 * Customer-facing fabric confirmation — Slice 5, revised for US-3.3. Same
 * structural pattern as PortalDesignBriefConfirm.tsx (read-only display + a
 * single mutation), extended with a Dispute action, since this is the only
 * portal confirmation surface the PRD requires both actions on.
 *
 * Quantity is now the tailor-logged value already on the garment record
 * (garment.quantity/quantityUnit) — the customer reviews and confirms it
 * here, they no longer type their own. This closes the gap the previous
 * version of this comment described (see the Slice 5 report).
 */
export function PortalFabricConfirm({ portalToken, garment }: Props) {
  const queryClient = useQueryClient();
  const queryKey = ['customer', 'order', portalToken];
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputeDescription, setDisputeDescription] = useState('');
  const hasQuantity = garment.quantity !== null && garment.quantity !== undefined && !!garment.quantityUnit;

  const confirmMutation = useMutation({
    mutationFn: () => portalFabricEvidenceApi.confirm(portalToken, garment.garmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const disputeMutation = useMutation<unknown, AxiosError<{ code?: string }>, void>({
    mutationFn: () =>
      portalDisputeApi.raiseDispute(portalToken, {
        category: 'MATERIAL',
        severity: 'WARNING',
        description: disputeDescription.trim(),
      }),
    onSuccess: () => {
      setDisputeOpen(false);
      setDisputeDescription('');
    },
  });

  const alreadyDisputed = disputeMutation.error?.response?.data?.code === 'ACTIVE_DISPUTE_EXISTS';

  if (garment.confirmedAt) {
    return (
      <div className="sf-card" style={{ borderTop: '2px solid #1e5c3a' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0', color: '#1e5c3a' }}>
          <span style={{ fontSize: 22 }}>&#10003;</span>
          <p className="font-bold" style={{ color: '#1e5c3a', margin: 0 }}>
            You confirmed the fabric for {garment.garmentName} on {formatDate(garment.confirmedAt)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="sf-card" style={{ borderTop: '2px solid #c49a1a' }}>
      <h3 className="text-h3 mb-lg">Please review the fabric for {garment.garmentName}</h3>

      {garment.evidencePhotos.length > 0 ? (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {garment.evidencePhotos.map((photo) => (
            <img
              key={photo.id}
              src={photo.secureUrl}
              alt="Fabric evidence"
              style={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 8, border: '1px solid #e5e7eb' }}
            />
          ))}
        </div>
      ) : (
        <p style={{ fontSize: '0.85rem', color: '#6b7280', fontStyle: 'italic', marginBottom: 16 }}>
          No fabric photo has been added yet.
        </p>
      )}

      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px' }}>
        {garment.fabricType && (
          <li style={{ marginBottom: 10, fontSize: '0.9rem' }}>
            <span style={{ fontWeight: 700, color: '#6b7280' }}>Fabric: </span>
            {garment.fabricType}
          </li>
        )}
        {garment.colorSwatch && (
          <li style={{ marginBottom: 10, fontSize: '0.9rem' }}>
            <span style={{ fontWeight: 700, color: '#6b7280' }}>Colour: </span>
            {garment.colorSwatch}
          </li>
        )}
        <li style={{ marginBottom: 10, fontSize: '0.9rem' }}>
          <span style={{ fontWeight: 700, color: '#6b7280' }}>Quantity: </span>
          {hasQuantity ? `${garment.quantity} ${garment.quantityUnit}` : 'Not yet recorded by your tailor'}
        </li>
        {garment.conditionNotes && (
          <li style={{ marginBottom: 10, fontSize: '0.9rem' }}>
            <span style={{ fontWeight: 700, color: '#6b7280' }}>Condition Notes: </span>
            {garment.conditionNotes}
          </li>
        )}
      </ul>

      {!hasQuantity && (
        <p style={{ fontSize: '0.85rem', color: '#c49a1a', marginBottom: 16 }}>
          Your tailor hasn't recorded a fabric quantity yet — check back once they have.
        </p>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          onClick={() => confirmMutation.mutate()}
          disabled={!hasQuantity || confirmMutation.isPending}
          style={{
            ...btnStyle,
            background: '#1e5c3a',
            color: '#fff',
            opacity: !hasQuantity || confirmMutation.isPending ? 0.6 : 1,
          }}
        >
          {confirmMutation.isPending ? 'Confirming…' : 'Confirm Fabric'}
        </button>

        {!disputeOpen && (
          <button
            onClick={() => setDisputeOpen(true)}
            style={{ ...btnStyle, background: 'transparent', color: '#c0392b', border: '1px solid #c0392b' }}
          >
            Dispute this fabric
          </button>
        )}
      </div>

      {confirmMutation.isError && (
        <p style={{ color: '#c0392b', fontSize: '0.85rem', marginTop: 8 }}>
          Failed to confirm. Please try again.
        </p>
      )}

      {disputeOpen && (
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #e5e7eb' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#6b7280' }}>
            What's wrong with this fabric?
            <textarea
              value={disputeDescription}
              onChange={(e) => setDisputeDescription(e.target.value)}
              rows={3}
              style={{ display: 'block', width: '100%', marginTop: 4, padding: 8, borderRadius: 6, border: '1px solid #ccc', fontFamily: 'inherit' }}
            />
          </label>

          {disputeMutation.isSuccess ? (
            <p style={{ color: '#1e5c3a', fontSize: '0.85rem', marginTop: 8 }}>
              Reported — see the dispute section below for status.
            </p>
          ) : (
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
              <button onClick={() => setDisputeOpen(false)} style={{ ...btnStyle, background: 'transparent', color: '#6b7280' }}>
                Cancel
              </button>
              <button
                onClick={() => disputeMutation.mutate()}
                disabled={!disputeDescription.trim() || disputeMutation.isPending}
                style={{
                  ...btnStyle,
                  background: '#c0392b',
                  color: '#fff',
                  opacity: !disputeDescription.trim() || disputeMutation.isPending ? 0.6 : 1,
                }}
              >
                {disputeMutation.isPending ? 'Submitting…' : 'Submit'}
              </button>
            </div>
          )}

          {disputeMutation.isError && (
            <p style={{ color: '#c0392b', fontSize: '0.85rem', marginTop: 8 }}>
              {alreadyDisputed
                ? 'A dispute is already open for this order — see the dispute section below.'
                : 'Failed to submit. Please try again.'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
