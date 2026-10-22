import { useEffect, useState } from 'react';
import { useOrders } from '../hooks/useOrders.ts';
import { WorkshopTableSkeleton } from '../../../components/ui/WorkshopTableSkeleton.tsx';
import { ErrorState } from '../../../components/feedback/ErrorState.tsx';
import { EditOrderModal } from './EditOrderModal.tsx';
import { OrderEntryItem } from './OrderEntryItem.tsx';
import { useNavigate } from 'react-router-dom';
import { useOrderPath } from '../useOrderPath.ts';
import { Box, Stack, TextField, Typography } from '@mui/material';

import '../styles/orders.css';

import { ChevronLeft, ChevronRight } from '@mui/icons-material';

export function OrdersList() {
  const navigate = useNavigate();
  const orderPath = useOrderPath();
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState('ALL');
  const [editingOrder, setEditingOrder] = useState<any>(null);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  // Search on the server once typing pauses, from the first page
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data: orders, isLoading, isError, error, refetch } = useOrders(page, 10, search || undefined);

  const searchBox = (
    <TextField
      size="small"
      fullWidth
      placeholder="Search order #, client name or phone, garment"
      value={searchInput}
      onChange={(e) => setSearchInput(e.target.value)}
      sx={{ mb: 2, px: 2 }}
      slotProps={{ htmlInput: { 'aria-label': 'Search orders' } }}
    />
  );

  if (isLoading) {
    return (
      <div className="orders-ledger">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-md px-md gap-xs md:gap-0">
          <h2 className="text-h2 ledger-title">Active Order Overview</h2>
          <div className="text-xs md:text-sm text-black">Synchronizing Order Ledger...</div>
        </div>
        <WorkshopTableSkeleton headers={['Order #', 'Customer', 'Garment', 'Deadline', 'Risk State']} />
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState 
        error={error} 
        onRetry={() => refetch()} 
        title="Ledger Synchronization Failed"
      />
    );
  }

  const filteredItems = orders?.items?.filter(order => {
    if (filter === 'ALL') return true;
    if (filter === 'AT_RISK') return order.riskLevel === 'AT_RISK';
    if (filter === 'OVERDUE') return order.riskLevel === 'OVERDUE';
    if (filter === 'COMPLETED') return order.status === 'COMPLETED';
    return true;
  });

  return (
    <div className="orders-ledger">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-md px-md gap-xs md:gap-0">
        <h2 className="text-h2 ledger-title">Production Ledger</h2>
        <div className="text-xs md:text-sm text-black">High-fidelity projection of workshop workload</div>
      </div>

      {searchBox}

      <Box sx={{ mb: 4 }}>
        <Stack spacing={0}>
          {filteredItems?.length === 0 ? (
            <Typography variant="body2" sx={{ color: 'text.secondary', p: 4, textAlign: 'center' }}>
              {search ? `No orders match "${search}".` : 'No orders found matching the selected filter.'}
            </Typography>
          ) : (
            filteredItems?.map((order, index) => (
              <OrderEntryItem 
                key={`${order.id}-${index}`} 
                order={order} 
                onClick={() => navigate(orderPath(order.id), { state: { targetGarmentId: order.garmentId } })}
              />
            ))
          )}
        </Stack>
      </Box>

      <div className="pagination-footer flex justify-between items-center">
        <button 
          className="btn btn-secondary pagination-btn responsive-btn" 
          disabled={page === 1}
          onClick={() => setPage(p => p - 1)}
        >
          <span className="btn-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ChevronLeft sx={{ fontSize: 18 }} /> Previous
          </span>
          <span className="btn-icon">
            <ChevronLeft sx={{ fontSize: 24 }} />
          </span>
        </button>
        <span className="text-sm font-bold text-muted pagination-text">
          PAGE {page} / {orders?.totalPages || 1}
        </span>
        <button 
          className="btn btn-secondary pagination-btn responsive-btn"
          disabled={!orders?.totalPages || page === orders.totalPages}
          onClick={() => setPage(p => p + 1)}
        >
          <span className="btn-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            Next <ChevronRight sx={{ fontSize: 18 }} />
          </span>
          <span className="btn-icon">
            <ChevronRight sx={{ fontSize: 24 }} />
          </span>
        </button>
      </div>

      <div className="mobile-filter-container">
        <div className="filter-scroll">
          {['ALL', 'AT_RISK', 'OVERDUE', 'COMPLETED'].map((f) => (
            <div 
              key={f} 
              className={`mobile-filter-chip ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f.replace('_', ' ')}
            </div>
          ))}
        </div>
      </div>

      {editingOrder && (
        <EditOrderModal 
          open={!!editingOrder} 
          onClose={() => setEditingOrder(null)} 
          order={editingOrder} 
        />
      )}
    </div>
  );
}
