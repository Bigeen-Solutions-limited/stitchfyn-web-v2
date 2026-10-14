import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { PublicLayout } from '../layouts/PublicLayout.tsx';
import { ProtectedLayout } from '../layouts/ProtectedLayout.tsx';
import { LoginPage } from '../../pages/LoginPage.tsx';
import { NotFoundPage } from '../../pages/NotFoundPage.tsx';
import { OrdersPage } from '../../pages/OrdersPage.tsx';
import { OrderDetailPage } from '../../pages/OrderDetailPage.tsx';
import { StaffManagementPage } from '../../pages/StaffManagementPage.tsx';
import { NewOrderPage } from '../../pages/NewOrderPage.tsx';
import { ProductionBoardPage } from '../../pages/ProductionBoardPage.tsx';
import { DashboardPage } from '../../pages/DashboardPage.tsx';
import { CustomersPage } from '../../pages/CustomersPage.tsx';
import { ClientProfilePage } from '../../pages/ClientProfilePage.tsx';
import { InventoryPage } from '../../pages/InventoryPage.tsx';
import { SettingsPage } from '../../pages/SettingsPage.tsx';
import AuditLogPage from '../../pages/AuditLogPage.tsx';
import { ForbiddenPage } from '../../pages/error/ForbiddenPage.tsx';
import ReportsPage from '../../pages/ReportsPage.tsx';
import { TrackingPage } from '../../pages/TrackingPage.tsx';
import { DisputesPage } from '../../pages/DisputesPage.tsx';
import { BetaFeatureGuard } from '../../components/feedback/BetaFeatureGuard.tsx';

import { CustomerPortalLayout } from '../../features/customer/layouts/CustomerPortalLayout.tsx';
import { CustomerOrderPage } from '../../features/customer/pages/CustomerOrderPage.tsx';
import { ProtectedRoute } from '../../features/auth/ProtectedRoute.tsx';
import { useAxiosInterceptors } from '../../infrastructure/http/use-axios-interceptors.ts';

import { DesignSystemPage } from '../../pages/DesignSystemPage.tsx';

import { SplashScreen } from '../../pages/SplashScreen.tsx';
import { SealVerificationPage } from '../../pages/SealVerificationPage.tsx';
import { ForgotPasswordPage } from '../../pages/ForgotPasswordPage.tsx';
import { ResetPasswordPage } from '../../pages/ResetPasswordPage.tsx';
import { VerifyEmailPage } from '../../pages/VerifyEmailPage.tsx';
import { ChangePasswordPage } from '../../pages/ChangePasswordPage.tsx';
import { GroupCoordinatorDashboard } from '../../features/group-order/GroupCoordinatorDashboard.tsx';
import { WorkflowTemplatesPage } from '../../pages/WorkflowTemplatesPage.tsx';
import { GroupOrdersPage } from '../../pages/GroupOrdersPage.tsx';
import { StitchScoreDetailPage } from '../../pages/StitchScoreDetailPage.tsx';
import { SystemAdminGuard } from '../../features/system-admin/guards/SystemAdminGuard.tsx';
import { SystemAdminLayout } from '../../features/system-admin/layouts/SystemAdminLayout.tsx';
import { SystemAdminOverview } from '../../features/system-admin/pages/SystemAdminOverview.tsx';
import { CompanyList } from '../../features/system-admin/pages/CompanyList.tsx';
import { CreateCompany } from '../../features/system-admin/pages/CreateCompany.tsx';
import { CompanyDetail } from '../../features/system-admin/pages/CompanyDetail.tsx';
import { UserList } from '../../features/system-admin/pages/UserList.tsx';
import { UserDetail } from '../../features/system-admin/pages/UserDetail.tsx';
import { AdminAuditLog } from '../../features/system-admin/pages/AdminAuditLog.tsx';

const AxiosInterceptorHandler = () => {
  useAxiosInterceptors();
  return <Outlet />;
};

export const router = createBrowserRouter([
  {
    element: <AxiosInterceptorHandler />,
    children: [
      {
        element: <PublicLayout />,
        children: [
          { path: '/', element: <SplashScreen /> },
          { path: '/login', element: <LoginPage /> },
          { path: '/forgot-password', element: <ForgotPasswordPage /> },
          { path: '/reset-password', element: <ResetPasswordPage /> },
          { path: '/verify-email', element: <VerifyEmailPage /> },
          { path: '/track/:slug', element: <TrackingPage /> },
          { path: '/public/seals/:code', element: <SealVerificationPage /> },
          ...(import.meta.env.DEV ? [{ path: '/design-system', element: <DesignSystemPage /> }] : []),
          {
            // Customers reach the portal by the link in their message, with no account, so never wrap it in ProtectedRoute
            element: <CustomerPortalLayout />,
            children: [
              { path: '/portal/orders/:id', element: <CustomerOrderPage /> },
            ],
          },
        ],
      },
      {
        element: (
          <ProtectedRoute>
            <ProtectedLayout />
          </ProtectedRoute>
        ),
        children: [
          { path: '/dashboard', element: <DashboardPage /> },
          { path: '/change-password', element: <ChangePasswordPage /> },
          {
            path: '/orders',
            element: (
              <ProtectedRoute requiredPermission="MANAGE_ORDERS">
                <OrdersPage />
              </ProtectedRoute>
            )
          },
          {
            path: '/orders/new',
            element: (
              <ProtectedRoute requiredPermission="MANAGE_ORDERS">
                <NewOrderPage />
              </ProtectedRoute>
            )
          },
          {
            path: '/orders/:id',
            element: (
              <ProtectedRoute requiredPermission="MANAGE_ORDERS">
                <OrderDetailPage />
              </ProtectedRoute>
            )
          },
          {
            path: '/staff',
            element: (
              <ProtectedRoute allowedRoles={['OWNER']}>
                <StaffManagementPage />
              </ProtectedRoute>
            )
          },
          {
            path: '/customers',
            element: (
              <ProtectedRoute requiredPermission="MANAGE_ORDERS">
                <CustomersPage />
              </ProtectedRoute>
            )
          },
          {
            path: '/customers/:id',
            element: (
              <ProtectedRoute requiredPermission="MANAGE_ORDERS">
                <ClientProfilePage />
              </ProtectedRoute>
            )
          },
          {
            path: '/production',
            element: <ProductionBoardPage />,
          },
          {
            path: '/inventory',
            element: (
              <ProtectedRoute allowedRoles={['OWNER', 'MANAGER']}>
                <InventoryPage />
              </ProtectedRoute>
            )
          },
          {
            path: '/settings',
            element: (
              <ProtectedRoute allowedRoles={['OWNER', 'MANAGER']}>
                <SettingsPage />
              </ProtectedRoute>
            )
          },
          {
            path: '/reports',
            element: (
              <ProtectedRoute allowedRoles={['OWNER', 'MANAGER']}>
                <ReportsPage />
              </ProtectedRoute>
            )
          },
          {
            path: '/reports/audit',
            element: (
              <ProtectedRoute allowedRoles={['OWNER']}>
                <AuditLogPage />
              </ProtectedRoute>
            )
          },
          {
            path: '/reports/security-audit',
            element: (
              <ProtectedRoute allowedRoles={['OWNER']}>
                <BetaFeatureGuard featureName="Security Rejection Log" />
              </ProtectedRoute>
            )
          },
          {
            path: '/disputes',
            element: (
              <ProtectedRoute allowedRoles={['OWNER', 'MANAGER', 'CUSTOMER']}>
                <DisputesPage />
              </ProtectedRoute>
            )
          },
          {
            path: '/measurements',
            element: <BetaFeatureGuard featureName="Measurement Vault" />
          },
          {
            path: '/payments',
            element: <BetaFeatureGuard featureName="Payment Ledger" />
          },
          {
            path: '/groups/:token',
            element: (
              <ProtectedRoute requiredPermission="MANAGE_ORDERS">
                <GroupCoordinatorDashboard />
              </ProtectedRoute>
            ),
          },
          {
            path: '/group-orders',
            element: (
              <ProtectedRoute allowedRoles={['OWNER', 'MANAGER']}>
                <GroupOrdersPage />
              </ProtectedRoute>
            ),
          },
          {
            path: '/workflow-templates',
            element: (
              <ProtectedRoute allowedRoles={['OWNER']}>
                <WorkflowTemplatesPage />
              </ProtectedRoute>
            ),
          },
          {
            path: '/stitch-score',
            element: (
              <ProtectedRoute allowedRoles={['OWNER']}>
                <StitchScoreDetailPage />
              </ProtectedRoute>
            ),
          },
        ],
      },
      {
        element: (
          <ProtectedRoute>
            <SystemAdminGuard>
              <SystemAdminLayout />
            </SystemAdminGuard>
          </ProtectedRoute>
        ),
        children: [
          { path: '/system-admin', element: <SystemAdminOverview /> },
          { path: '/system-admin/companies', element: <CompanyList /> },
          { path: '/system-admin/companies/new', element: <CreateCompany /> },
          { path: '/system-admin/companies/:id', element: <CompanyDetail /> },
          { path: '/system-admin/users', element: <UserList /> },
          { path: '/system-admin/users/:id', element: <UserDetail /> },
          { path: '/system-admin/audit-log', element: <AdminAuditLog /> },
        ],
      },
      { path: '/403', element: <ForbiddenPage /> },
      { path: '/404', element: <NotFoundPage /> },
      { path: '*', element: <Navigate to="/404" replace /> },
    ],
  },
]);
