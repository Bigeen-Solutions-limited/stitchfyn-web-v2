// camelCase, because that is what the API sends
export interface AuditRecord {
  id: string;
  companyId: string;
  actorId: string | null;
  // Joined from users by the API; null for customer, portal and system actions
  actorName?: string | null;
  action: string;
  targetId: string | null;
  contextId: string | null;
  metadata: Record<string, string | number | boolean | null>;
  occurredAt: string;
  witnessedAt: string;
  signature: string;
}
