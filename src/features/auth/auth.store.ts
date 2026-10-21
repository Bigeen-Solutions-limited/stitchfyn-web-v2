import { create } from 'zustand';
import type { AuthState, AuthUser } from './auth.types';

interface AuthActions {
  setAuth: (token: string, user: AuthUser) => void;
  clearAuth: (options?: { expired?: boolean }) => void;
  setLoading: (isLoading: boolean) => void;
}

const initialState: AuthState = {
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: true, // true until the startup session check finishes
  sessionExpired: false,
};

export const useAuthStore = create<AuthState & AuthActions>((set) => ({
  ...initialState,

  setAuth: (token, user) =>
    set({
      accessToken: token,
      user,
      isAuthenticated: true,
      isLoading: false,
      sessionExpired: false,
    }),

  clearAuth: (options) =>
    set({
      ...initialState,
      isLoading: false,
      sessionExpired: options?.expired ?? false,
    }),

  setLoading: (isLoading) => set({ isLoading }),
}));
