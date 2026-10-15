import { useLayoutEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { apiClient } from './axios.client';
import { useAuthStore } from '../../features/auth/auth.store';
import { parseApiError } from '../../lib/errors/parse-api-error';
import type { ErrorMessage } from '../../lib/errors/error-messages';

const PUBLIC_PATHS = ['/', '/login', '/forgot-password', '/reset-password', '/verify-email'];
const PUBLIC_PREFIXES = ['/track/', '/public/', '/portal/'];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.includes(pathname) || PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

// Shared across requests so only one token refresh runs at a time
let isRefreshing = false;

interface QueuedRequest {
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}

let failedQueue: QueuedRequest[] = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (token) {
      prom.resolve(token);
    } else {
      prom.reject(error);
    }
  });
  failedQueue = [];
};

export function useAxiosInterceptors() {
  const navigate = useNavigate();
  const interceptorId = useRef<number | null>(null);

  useLayoutEffect(() => {
    if (interceptorId.current !== null) {
      apiClient.interceptors.response.eject(interceptorId.current);
    }

    // On 401, refresh once and retry; send people to login or the 403 page when needed
    interceptorId.current = apiClient.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & {
          _retry?: boolean;
        };

        // A failed refresh is final; retrying it would only refresh again
        const isRefreshCall = originalRequest?.url?.includes('/auth/refresh');

        if (error.response?.status === 401 && !originalRequest._retry && !isRefreshCall) {
          if (isRefreshing) {
            return new Promise<string>((resolve, reject) => {
              failedQueue.push({ resolve, reject });
            })
              .then((token) => {
                originalRequest.headers.Authorization = `Bearer ${token}`;
                return apiClient(originalRequest);
              })
              .catch((err) => Promise.reject(err));
          }

          originalRequest._retry = true;
          isRefreshing = true;

          try {
            const response = await axios.post(
              `${apiClient.defaults.baseURL}/auth/refresh`,
              {},
              { withCredentials: true }
            );

            const { accessToken, user } = response.data;
            useAuthStore.getState().setAuth(accessToken, user);

            processQueue(null, accessToken);
            isRefreshing = false;

            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            return apiClient(originalRequest);
          } catch (refreshError) {
            processQueue(refreshError, null);
            isRefreshing = false;
            useAuthStore.getState().clearAuth();

            // Public pages (customer links, seal checks, password emails) expect a 401 when nobody is signed in
            if (!isPublicPath(window.location.pathname)) {
               navigate('/login');
            }

            return Promise.reject(refreshError);
          }
        }

        if (error.response?.status === 403) {
          if (window.location.pathname !== "/403") {
            navigate('/403');
          }
          return Promise.reject(error);
        }

        // Attach a friendly message for callers to show
        const parsedError = parseApiError(error);
        (error as AxiosError & { parsedError?: ErrorMessage }).parsedError = parsedError;

        return Promise.reject(error);
      }
    );

    return () => {
      if (interceptorId.current !== null) {
        apiClient.interceptors.response.eject(interceptorId.current);
      }
    };
  }, [navigate]);
}
