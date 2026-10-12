import axios, { AxiosError } from 'axios';
import type { ErrorMessage } from './error-messages';
import type { ErrorCode } from './error-codes';
import { errorMessages } from './error-messages';
import { ErrorCodes } from './error-codes';
import { waitingFor } from '../activation';

/**
 * Parses an unknown error (likely from an API call) into a user-friendly ErrorMessage object.
 * Following the API Consumption Doctrine: never display raw backend messages or stack traces.
 */
export function parseApiError(error: unknown): ErrorMessage {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ code?: string; metadata?: { reason?: string; missingSteps?: string[] } }>;

    // 0. A structured metadata.reason is more specific than the bare
    // `code` (several distinct backend conditions share the same generic
    // DomainError code, e.g. every ConflictError sends code: "CONFLICT" —
    // metadata.reason is how a specific one, like the progress-photo
    // 3-photo limit, gets its own message without a raw message
    // passthrough or a new error framework.
    const reason = axiosError.response?.data?.metadata?.reason;
    if (reason && errorMessages[reason as ErrorCode]) {
      return errorMessages[reason as ErrorCode];
    }

    // 1. Check for domain-specific error code in response body
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
      
      // Fallback for unknown domain codes
      return errorMessages[ErrorCodes.UNKNOWN_ERROR];
    }

    // 2. Check for network/connection errors (no response from server)
    if (!axiosError.response) {
      return {
        title: 'Connection Error',
        detail: 'Could not reach the server. Check your connection.',
      };
    }
  }

  // 3. Generic fallback for non-Axios errors or unexpected response structures
  return errorMessages[ErrorCodes.UNKNOWN_ERROR];
}
