import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { logoutApi } from '../auth.api';
import { useAuthStore } from '../auth.store';
import { queryClient } from '../../../query/queryClient';
import { useDomainError } from '../../../lib/errors';

// For the current user, read useAuthStore(state => state.user)

export function useLogout() {
  const navigate = useNavigate();
  const { handleError } = useDomainError();
  const { clearAuth } = useAuthStore();

  return useMutation({
    mutationFn: logoutApi,
    onSettled: () => {
      // Sign-in state lives in memory, never in localStorage
      clearAuth();
      queryClient.clear();
      navigate('/login');
    },
    onError: (err: any) => handleError(err),
  });
}
