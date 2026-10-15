import { useLocation } from 'react-router-dom';

// Labels match the sidebar so the header and navigation agree
const routeConfig: Record<string, string> = {
  dashboard: 'Dashboard',
  orders: 'Orders',
  production: 'Production',
  customers: 'Customers',
  inventory: 'Inventory',
  reports: 'Reports',
  staff: 'Staff Management',
  settings: 'Settings',
  new: 'New',
  disputes: 'Disputes',
  audit: 'Audit Log',
  'security-audit': 'Security Audit',
  'group-orders': 'Group Orders',
  groups: 'Group Orders',
  'workflow-templates': 'Workflow Templates',
  'stitch-score': 'StitchScore',
  measurements: 'Measurements',
  payments: 'Payments',
  'change-password': 'Change Password',
};

export const labelFor = (segment: string) => routeConfig[segment] ?? 'Details';

const pageTitles: Record<string, string> = {
  '/orders/new': 'New Order',
  '/reports/audit': 'Audit Log',
  '/reports/security-audit': 'Security Audit',
};

export function usePageTitle(): string {
  const { pathname } = useLocation();
  if (pageTitles[pathname]) return pageTitles[pathname];
  const first = pathname.split('/').filter(Boolean)[0];
  return first ? labelFor(first) : 'Dashboard';
}
