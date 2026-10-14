import { useNavigate } from 'react-router-dom';
import AddIcon from '@mui/icons-material/Add';
import { CircularProgress, Typography } from '@mui/material';
import { CapacityBanner } from '../features/orders/components/CapacityBanner.tsx';
import { OrdersList } from '../features/orders/components/OrdersList.tsx';
import { UrgentGarments } from '../features/orders/components/UrgentGarments.tsx';
import { usePullToRefresh } from '../hooks/usePullToRefresh.ts';
import '../features/orders/styles/orders.css';

export function OrdersPage() {
  const navigate = useNavigate();
  // Pull-to-refresh is a placeholder: it doesn't refetch yet
  const { refreshing, pullDelta } = usePullToRefresh({
    onRefresh: async () => {
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  });

  return (
    <div className="orders-page container" style={{ position: 'relative' }}>
      {/* Pull to Refresh Indicator */}
      <div 
        style={{ 
          position: 'absolute', 
          top: -40, 
          left: 0, 
          right: 0, 
          display: 'flex', 
          justifyContent: 'center',
          transform: `translateY(${Math.min(pullDelta, 100)}px)`,
          opacity: pullDelta > 20 ? 1 : 0,
          transition: refreshing ? 'transform 0.2s' : 'none',
          zIndex: 10
        }}
      >
        <CircularProgress 
          size={24} 
          thickness={6} 
          value={refreshing ? undefined : Math.min((pullDelta / 80) * 100, 100)}
          variant={refreshing ? "indeterminate" : "determinate"}
          sx={{ color: '#1e5c3a' }}
        />
      </div>

      <header className="mb-lg flex flex-col md:flex-row md:justify-between md:items-end gap-sm md:gap-0">
        <div>
          <Typography 
            variant="h3" 
            className="mobile-page-title md:text-h1"
            sx={{ 
              fontSize: { xs: '1.25rem', md: 'clamp(1.5rem, 4vw, 2.5rem)' },
              fontWeight: 800,
              lineHeight: 1.2 
            }}
          >
            Deadline Operating System
          </Typography>
          <p className="text-black text-sm md:text-base mt-xs">High-fidelity projection of workshop workload risk</p>
        </div>
        <div className="text-left md:text-right mt-sm md:mt-0 desktop-hide">
          <span className="badge badge-primary">LIVE LEDGER</span>
        </div>
      </header>

      <CapacityBanner />

      <UrgentGarments />

      <section className="sf-card" style={{ padding: 'var(--space-lg)' }}>
        <OrdersList />
      </section>

      {/* Floating Action Button - Mobile Only */}
      <div className="fab-container desktop-hide">
        <div className="fab-main" onClick={() => navigate('/orders/new')}>
          <AddIcon />
        </div>
      </div>
    </div>
  );
}
