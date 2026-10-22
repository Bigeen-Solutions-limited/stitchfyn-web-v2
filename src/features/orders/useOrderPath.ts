import { usePermissions } from '../auth/use-permissions';

// Where an order opens for the current user: the full page, or the essentials view for assigned-work-only staff (tailors)
export function useOrderPath() {
  const { hasCapability } = usePermissions();
  const full = hasCapability('VIEW_ALL_STORE_WORK');
  return (orderId: string) => (full ? `/orders/${orderId}` : `/orders/${orderId}/work`);
}
