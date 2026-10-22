import { useAuthStore } from './auth.store';

// Must match the server's capability names
export const AuthCapabilities = {
  MANAGE_ORDERS: 'MANAGE_ORDERS',
  BYPASS_CAPACITY: 'BYPASS_CAPACITY',
  TRANSITION_STAGE: 'TRANSITION_STAGE',
  OVERRIDE_TRUST: 'OVERRIDE_TRUST',
  RAISE_DISPUTE: 'RAISE_DISPUTE',
  RESOLVE_DISPUTE: 'RESOLVE_DISPUTE',
  THAW_DISPUTE: 'THAW_DISPUTE',
  MANAGE_STAFF: 'MANAGE_STAFF',
  VIEW_AUDIT_LOGS: 'VIEW_AUDIT_LOGS',
  SUSPEND_ACCOUNT: 'SUSPEND_ACCOUNT',
  // The server's enforced capabilities (Capability enum, upper-cased)
  VIEW_ORDER: 'VIEW_ORDER',
  UPDATE_PRODUCTION: 'UPDATE_PRODUCTION',
  VIEW_ALL_STORE_WORK: 'VIEW_ALL_STORE_WORK',
} as const;

export type CapabilityType = (typeof AuthCapabilities)[keyof typeof AuthCapabilities];

export function usePermissions() {
  const user = useAuthStore((state) => state.user);

  // Check capabilities, never role names
  const hasCapability = (cap: CapabilityType): boolean => {
    if (!user || !user.capabilities) return false;
    return user.capabilities.includes(cap);
  };

  return {
    hasCapability,
    isAuthenticated: !!user,
    userId: user?.id,
    companyId: user?.companyId,
  };
}
