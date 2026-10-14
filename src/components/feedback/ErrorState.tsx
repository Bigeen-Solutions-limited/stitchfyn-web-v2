import { mapErrorCode } from '../../utils/errorMapper';

interface ErrorStateProps {
  error: any;
  onRetry: () => void;
  title?: string;
}

export function ErrorState({ error, onRetry, title = "Synchronization Error" }: ErrorStateProps) {
  const errorCode = error?.response?.data?.code || (error instanceof Error ? 'GENERIC_ERROR' : undefined);
  const message = mapErrorCode(errorCode);

  return (
    <div className="sf-card error-state" style={{ 
      padding: 'var(--space-xl)', 
      textAlign: 'center',
      border: '1px solid var(--color-danger)',
      background: 'rgba(220, 38, 38, 0.02)',
      backdropFilter: 'blur(4px)',
      borderRadius: 'var(--radius-card)',
      margin: 'var(--space-md) 0'
    }}>
      <div style={{ 
        fontSize: '2.5rem', 
        marginBottom: 'var(--space-md)',
        color: 'var(--color-danger)' 
      }}>
        ⚠️
      </div>
      <h3 className="text-h3" style={{ marginBottom: 'var(--space-sm)' }}>{title}</h3>
      <p className="text-secondary" style={{ marginBottom: 'var(--space-lg)', maxWidth: '400px', marginInline: 'auto' }}>
        {message}
      </p>
      
      <button 
        onClick={onRetry}
        className="sf-btn sf-btn-primary"
        style={{ 
          backgroundColor: 'var(--color-primary)', 
          color: 'white',
          padding: 'var(--space-sm) var(--space-xl)',
          fontWeight: 700
        }}
      >
        RETRY SYNCHRONIZATION
      </button>

      {/* Raw error text is shown in development only */}
      {import.meta.env.DEV && error?.message && (
        <div style={{ marginTop: 'var(--space-xl)', fontSize: '10px', color: 'var(--color-text-muted)', opacity: 0.5 }}>
          Dev Note: {error.message}
        </div>
      )}
    </div>
  );
}
