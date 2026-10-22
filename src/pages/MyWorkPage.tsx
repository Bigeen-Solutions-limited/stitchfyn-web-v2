import { Typography } from '@mui/material';
import { OrdersList } from '../features/orders/components/OrdersList.tsx';
import '../features/orders/styles/orders.css';

// A tailor's own orders: the server lists only garments assigned to them
export function MyWorkPage() {
  return (
    <div className="orders-page container">
      <header className="mb-lg">
        <Typography variant="h3" sx={{ fontSize: { xs: '1.25rem', md: '2rem' }, fontWeight: 800 }}>
          My Orders
        </Typography>
        <p className="text-black text-sm mt-xs">Garments assigned to you</p>
      </header>
      <section className="sf-card" style={{ padding: 'var(--space-lg)' }}>
        <OrdersList />
      </section>
    </div>
  );
}
