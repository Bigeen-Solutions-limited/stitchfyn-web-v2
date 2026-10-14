// Unfinished features show "coming soon"; only turn one on once its server endpoint exists
export const FEATURES = {
  securityAuditLog: false,      // needs GET /audit/security-violations in API
  generalProfileSettings: false, // settings save not wired to any endpoint
  capacitySettingsPanel: false,  // shows placeholder values; the settings endpoint isn't built
} as const;

export type FeatureKey = keyof typeof FEATURES;
