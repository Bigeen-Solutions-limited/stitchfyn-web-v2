import axios, { AxiosError } from 'axios';
import type { ErrorMessage } from './error-messages';
import type { ErrorCode } from './error-codes';
import { errorMessages } from './error-messages';
import { ErrorCodes } from './error-codes';
import { waitingFor } from '../activation';

// Turns any error into a friendly message; never shows raw server text
export function parseApiError(error: unknown): ErrorMessage {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ code?: string; metadata?: { reason?: string; missingSteps?: string[] } }>;

    // A specific reason beats the generic code (many conflicts share "CONFLICT")
    const reason = axiosError.response?.data?.metadata?.reason;
    if (reason && errorMessages[reason as ErrorCode]) {
      return errorMessages[reason as ErrorCode];
    }

    const errorCode = axiosError.response?.data?.code;
    const missingSteps = axiosError.response?.data?.metadata?.missingSteps;
    if (errorCode === ErrorCodes.ACTIVATION_INCOMPLETE && missingSteps?.length) {
      return { ...errorMessages.ACTIVATION_INCOMPLETE, detail: waitingFor(missingSteps) };
    }
    if (errorCode) {
      const mappedMessage = errorMessages[errorCode as ErrorCode];
      if (mappedMessage) {
        return mappedMessage;
      }
      
      return errorMessages[ErrorCodes.UNKNOWN_ERROR];
    }

    // No response means a connection problem
    if (!axiosError.response) {
      return {
        title: 'Connection Error',
        detail: 'Could not reach the server. Check your connection.',
      };
    }
  }

  return errorMessages[ErrorCodes.UNKNOWN_ERROR];
}
