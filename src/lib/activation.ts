/** LR-1: customer-facing names for the 3-step activation gate. */
export const ACTIVATION_STEP_LABELS: Record<string, string> = {
  payment: 'Deposit',
  fabric: 'Fabric confirmation',
  design: 'Design approval',
};

export function waitingFor(steps: string[]): string {
  return `Waiting for: ${steps.map(s => ACTIVATION_STEP_LABELS[s] ?? s).join(', ')}`;
}

/** D-1: only a pending deposit may be acknowledged, and only by OWNER or MANAGER. */
export function canAcknowledgeDeposit(steps: string[], role?: string): boolean {
  return steps.length === 1 && steps[0] === 'payment' && (role === 'OWNER' || role === 'MANAGER');
}
