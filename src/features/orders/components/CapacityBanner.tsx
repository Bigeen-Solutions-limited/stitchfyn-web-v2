import { useState, useEffect } from 'react';
import { useOrders } from '../hooks/useOrders.ts';
import { WarningAmberRounded as WarningIcon } from '@mui/icons-material';

export function CapacityBanner() {
  const { data: orders } = useOrders();
  const [commandError, setCommandError] = useState(false);
  
  const isOverCapacity = orders?.capacityWarning || commandError;

  useEffect(() => {
    const handleError = () => setCommandError(true);
    window.addEventListener('sf-capacity-exceeded', handleError);
    return () => window.removeEventListener('sf-capacity-exceeded', handleError);
  }, []);

  if (!isOverCapacity) return null;

  return (
    <div className="capacity-banner-sticky" style={{ 
      position: 'sticky',
      top: 0,
      zIndex: 100,
      backgroundColor: 'var(--color-warning)',
      color: 'var(--color-primary)',
      padding: 'var(--space-sm) var(--space-lg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 'var(--space-md)',
      boxShadow: 'var(--shadow-md)',
      fontWeight: 800,
      textAlign: 'center',
      backdropFilter: 'blur(8px)',
      borderBottom: '1px solid rgba(0,0,0,0.1)',
      animation: 'slideDown 0.3s ease-out'
    }}>
      <WarningIcon sx={{ fontSize: '1.25rem' }} aria-hidden />
      <span>Workshop capacity exceeded. Consider delaying intake.</span>
      
      <style>{`
        @keyframes slideDown {
          from { transform: translateY(-100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
