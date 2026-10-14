export type Capability = 
  | 'MANAGE_ORDERS'
  | 'BYPASS_CAPACITY'
  | 'TRANSITION_STAGE'
  | 'OVERRIDE_TRUST'
  | 'RAISE_DISPUTE'
  | 'RESOLVE_DISPUTE'
  | 'THAW_DISPUTE'
  | 'MANAGE_STAFF'
  | 'VIEW_AUDIT_LOGS'
  | 'SUSPEND_ACCOUNT';

export type StitchFynRole = 'OWNER' | 'MANAGER' | 'TAILOR' | 'FRONT_DESK' | 'CUSTOMER' | 'SYSTEM_ADMIN';

export interface AuthUser {
  id: string;
  companyId: string | null;
  storeId?: string;
  email: string;
  fullName: string;
  role: StitchFynRole;
  capabilities: Capability[]; // permissions worked out by the server
  avatarUrl?: string;
  mustChangePassword?: boolean;
}

export interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}
