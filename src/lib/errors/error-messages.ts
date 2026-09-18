import type { ErrorCode } from './error-codes';

export type ErrorMessage = {
  title: string;           // Short heading for toast or alert
  detail: string;          // Actionable explanation for the user
  field?: string;          // If present, which form field to highlight
};

export const errorMessages: Record<ErrorCode, ErrorMessage> = {
  AUTH_TOKEN_MISSING: {
    title: 'Session Required',
    detail: 'Please log in to continue.',
  },
  AUTH_PAYLOAD_MALFORMED: {
    title: 'Authentication Error',
    detail: 'The authentication request was malformed. Please try again.',
  },
  AUTH_SESSION_EXPIRED: {
    title: 'Session Expired',
    detail: 'You\'ve been signed out due to inactivity. Please sign back in.',
  },
  CAPACITY_LIMIT_EXCEEDED: {
    title: 'Workshop Full',
    detail: 'Your workshop is fully booked. Complete existing orders before adding new ones.',
  },
  MATERIAL_PHOTO_REQUIRED: {
    title: 'Photo Required',
    detail: 'A photo of the material must be attached before logging this entry.',
    field: 'photoUrl',
  },
  MATERIAL_DELTA_ZERO: {
    title: 'Invalid Quantity',
    detail: 'Please enter a number greater than zero.',
    field: 'quantityDelta',
  },
  MEASUREMENT_ORDER_LOCKED: {
    title: 'Order Locked',
    detail: 'This order is locked. New measurements cannot be added to a completed order.',
  },
  ORDER_EVENT_DATE_REQUIRED: {
    title: 'Event Date Required',
    detail: 'Please fill out this field to calculate the production deadline.',
    field: 'eventDate',
  },
  ORDER_NOT_FOUND: {
    title: 'Order Not Found',
    detail: 'We couldn\'t find what you\'re looking for.',
  },
  WORKFLOW_STAGE_SKIP: {
    title: 'Stage Cannot Be Skipped',
    detail: 'Workflow stages must be completed in order. Complete the current stage first.',
  },
  WORKFLOW_INVALID_TRANSITION: {
    title: 'Invalid Stage Transition',
    detail: 'This workflow transition is not permitted from the current stage.',
  },
  TENANT_MISMATCH: {
    title: 'Access Denied',
    detail: 'Only team members with specific permissions can access this.',
  },
  VALIDATION_ERROR: {
    title: 'Check Your Inputs',
    detail: 'One or more fields have invalid values. Please review and correct them.',
  },
  // Generic siblings of DomainError's own base codes (ARCHITECTURE.md's
  // {code, message, metadata} shape) — every NotFoundError/ConflictError in
  // the app sends exactly one of these two, but neither had a mapped
  // message before, so they all fell through to UNKNOWN_ERROR. Added here
  // (not a new error framework — the existing lookup table) because the
  // Staff Progress-Photo Capture UI's own 404 (bad garment/stage) and 409
  // (3-photo limit) needed a real message, and this is the established
  // mechanism for that.
  NOT_FOUND: {
    title: 'Not Found',
    detail: 'We couldn\'t find what you\'re looking for.',
  },
  CONFLICT: {
    title: 'Action Not Allowed',
    detail: 'This isn\'t possible right now — please refresh and try again.',
  },
  PROGRESS_PHOTO_LIMIT_REACHED: {
    title: 'Photo Limit Reached',
    detail: 'This stage already has 3 progress photos — the maximum allowed.',
  },
  PROGRESS_PHOTO_REQUIRED: {
    title: 'Photo Required',
    detail: 'Add at least one progress photo before completing this stage.',
  },
  FINAL_QUALITY_REVIEW_NOT_READY: {
    title: 'Not Ready for Collection',
    detail: 'Every garment on this order must finish production before the final quality review can be completed.',
  },
  FINAL_QUALITY_REVIEW_ALREADY_COMPLETED: {
    title: 'Already Reviewed',
    detail: 'The final quality review for this order has already been completed.',
  },
  UNKNOWN_ERROR: {
    title: 'Unexpected Error',
    detail: 'We ran into an issue. Please refresh the page, or contact support if the issue persists.',
  },
};
