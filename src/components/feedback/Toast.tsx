import { create } from 'zustand';

interface Toast {
  type: 'success' | 'error';
  title: string;
  detail: string;
}

interface ToastState {
  toast: Toast | null;
  showToast: (title: string, detail: string, type?: 'success' | 'error') => void;
  hideToast: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toast: null,
  showToast: (title, detail, type = 'success') => {
    set({ toast: { title, detail, type } });
    setTimeout(() => set({ toast: null }), 5000);
  },
  hideToast: () => set({ toast: null }),
}));

// For code outside React components
export const showToast = (title: string, detail: string, type: 'success' | 'error' = 'success') => {
  useToastStore.getState().showToast(title, detail, type);
};

export function Toast() {
  const { toast } = useToastStore();

  if (!toast) return null;

  return (
    <div className={`sf-toast sf-glass ${toast.type}`} style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      padding: '16px 24px',
      borderRadius: 'var(--radius-card)',
      zIndex: 9999,
      border: `1px solid ${toast.type === 'success' ? 'var(--color-success)' : 'var(--color-danger)'}`,
      color: 'var(--color-text)',
      backgroundColor: 'white',
      boxShadow: 'var(--shadow-lg)',
      animation: 'slideIn 0.3s ease-out',
      minWidth: '320px',
      maxWidth: '450px',
      display: 'flex',
      flexDirection: 'column',
      gap: '4px'
    }}>
      <div style={{ 
        fontWeight: 'bold', 
        color: toast.type === 'success' ? 'var(--color-success)' : 'var(--color-danger)',
        fontSize: '1rem'
      }}>
        {toast.title}
      </div>
      <div style={{ fontSize: '0.875rem', opacity: 0.8, color: 'var(--color-text-secondary)' }}>
        {toast.detail}
      </div>
    </div>
  );
}
