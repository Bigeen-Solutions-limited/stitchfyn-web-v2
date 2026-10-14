import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { portalCollectionApi, type ChecklistItem } from '../../orders/collection.api';

interface Props {
  portalToken: string;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function PortalCollectionSignoff({ portalToken }: Props) {
  const queryClient = useQueryClient();
  const queryKey = ['portal', portalToken, 'collection-checklist'];

  const { data: checklist, isLoading } = useQuery({
    queryKey,
    queryFn: () => portalCollectionApi.getChecklist(portalToken),
    retry: (failureCount, err: any) => {
      if (err?.response?.status === 404) return false;
      return failureCount < 2;
    },
  });

  const signoffMutation = useMutation({
    mutationFn: () => portalCollectionApi.customerSignoff(portalToken),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  // Nothing to show until the checklist exists and the tailor has signed
  if (isLoading || !checklist) return null;

  if (!checklist.tailorSignoffAt) return null;

  return (
    <div className="sf-card" style={{ borderTop: '2px solid #1e5c3a' }}>
      {checklist.customerSignoffAt ? (
        /* Confirmed state */
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 0',
            color: '#1e5c3a',
          }}
        >
          <span style={{ fontSize: 22 }}>&#10003;</span>
          <p className="font-bold" style={{ color: '#1e5c3a', margin: 0 }}>
            You confirmed collection on {formatDate(checklist.customerSignoffAt)}
          </p>
        </div>
      ) : (
        /* Action required state */
        <>
          <h3 className="text-h3 mb-lg">Your tailor has confirmed collection</h3>

          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px' }}>
            {checklist.items.map((item: ChecklistItem, idx: number) => (
              <li
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  marginBottom: 10,
                  fontSize: '0.9rem',
                }}
              >
                <span
                  style={{
                    display: 'inline-block',
                    width: 18,
                    height: 18,
                    border: '2px solid #ccc',
                    borderRadius: 3,
                    flexShrink: 0,
                  }}
                />
                {item.label}
              </li>
            ))}
          </ul>

          <button
            onClick={() => signoffMutation.mutate()}
            disabled={signoffMutation.isPending}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 24px',
              borderRadius: 8,
              border: 'none',
              background: '#1e5c3a',
              color: '#fff',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: signoffMutation.isPending ? 'not-allowed' : 'pointer',
              opacity: signoffMutation.isPending ? 0.6 : 1,
            }}
          >
            {signoffMutation.isPending ? 'Confirming…' : 'Confirm Collection'}
          </button>

          {signoffMutation.isError && (
            <p style={{ color: '#c0392b', fontSize: '0.85rem', marginTop: 8 }}>
              Failed to confirm. Please try again.
            </p>
          )}
        </>
      )}
    </div>
  );
}
