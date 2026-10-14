import { useToastStore } from '../../components/feedback/Toast';
import { parseApiError } from './parse-api-error';

// Shows an API error as a form field error when possible, otherwise as a toast
export function useDomainError() {
  const { showToast } = useToastStore();

  const handleError = (error: unknown, setFieldError?: (field: any, error: { message: string }) => void) => {
    const message = parseApiError(error);

    if (message.field && setFieldError) {
      setFieldError(message.field, { message: message.detail });
      return;
    }

    showToast(message.title, message.detail, 'error');
  };

  return { handleError };
}
