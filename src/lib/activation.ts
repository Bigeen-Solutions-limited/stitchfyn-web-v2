// Customer-facing names for the three activation steps
export const ACTIVATION_STEP_LABELS: Record<string, string> = {
  payment: 'Deposit',
  fabric: 'Fabric confirmation',
  design: 'Design approval',
};

export function waitingFor(steps: string[]): string {
  return `Waiting for: ${steps.map(s => ACTIVATION_STEP_LABELS[s] ?? s).join(', ')}`;
}

// Only owners and managers may waive a step, and only the deposit
export function canAcknowledgeDeposit(steps: string[], role?: string): boolean {
  return steps.length === 1 && steps[0] === 'payment' && (role === 'OWNER' || role === 'MANAGER');
}
