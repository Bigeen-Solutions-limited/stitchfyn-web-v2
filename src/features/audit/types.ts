/**
 * Audit Types — Pure Projection Layer
 *
 * camelCase — matches what the backend actually sends. The API's
 * CamelCasePlugin (createDbConnection) is unconditionally active; a
 * snake_case field here (witnessed_at, occurred_at, actor_id, etc.) would
 * read as undefined at runtime.
 */
export interface AuditRecord {
  id: string;
  companyId: string;
  actorId: string | null;
  action: string;
  targetId: string | null;
  contextId: string | null;
  metadata: Record<string, string | number | boolean | null>;
  occurredAt: string;
  witnessedAt: string;
  signature: string;
}
