export const keys = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  orders: {
    all: ['orders'] as const,
    list: (page: number, limit: number) => ['orders', 'list', { page, limit }] as const,
    detail: (id: string) => ['orders', id] as const,
    work: (id: string) => ['orders', id, 'work'] as const,
    deadlineRisk: (id: string) => ['orders', id, 'risk'] as const,
    garments: (id: string) => ['orders', id, 'garments'] as const,
  },
  garments: {
    detail: (id: string) => ['garments', id] as const,
  },
  measurements: {
    list: (customerId: string) => ['measurements', customerId] as const,
  },
  materials: {
    ledger: (orderId: string) => ['materials', orderId] as const,
  },
  collection: {
    checklist: (orderId: string) => ['collection', 'checklist', orderId] as const,
    readiness: (orderId: string) => ['collection', 'readiness', orderId] as const,
  },
  workflow: {
    stages: (orderId: string) => ['workflow', orderId, 'stages'] as const,
    garment: (garmentId: string) => ['workflow', 'garment', garmentId] as const,
    templates: ['workflow', 'templates'] as const,
    activeTasks: ['workflow', 'active-tasks'] as const,
    progressPhotos: (garmentId: string) => ['workflow', 'garment', garmentId, 'progress-photos'] as const,
  },
  staff: {
    all: ['staff'] as const,
    list: (storeId?: string) => ['staff', 'list', { storeId }] as const,
  },
  analytics: {
    overview: ['analytics', 'overview'] as const,
    admin: ['analytics', 'admin'] as const,
    revenueReport: (query: object) => ['analytics', 'reports', 'revenue', query] as const,
    turnaroundReport: (query: object) => ['analytics', 'reports', 'turnaround', query] as const,
  },
  inventory: {
    overview: ['inventory', 'overview'] as const,
  },
  customers: {
    list: (page: number, limit: number, search?: string) => ['customers', 'list', { page, limit, search }] as const,
    search: (query: string) => ['customers', 'search', query] as const,
    detail: (id: string) => ['customers', 'profile', id] as const,
  },
  disputes: {
    list: (page: number, limit: number) => ['disputes', 'list', { page, limit }] as const,
    projection: (orderId: string) => ['disputes', 'projection', orderId] as const,
  },
  groupOrders: {
    list: (page: number, limit: number) => ['groupOrders', 'list', { page, limit }] as const,
  },
  stitchScore: {
    detail: (companyId: string) => ['stitchScore', companyId] as const,
  },
  notifications: {
    list: ['notifications', 'list'] as const,
  },
  systemAdmin: {
    stats: ['system-admin', 'stats'] as const,
    companies: {
      all: ['system-admin', 'companies'] as const,
      list: (filters?: Record<string, unknown>) => ['system-admin', 'companies', 'list', filters] as const,
      detail: (id: string) => ['system-admin', 'companies', id] as const,
      users: (id: string) => ['system-admin', 'companies', id, 'users'] as const,
      stores: (id: string) => ['system-admin', 'companies', id, 'stores'] as const,
    },
    users: {
      all: ['system-admin', 'users'] as const,
      list: (filters?: Record<string, unknown>) => ['system-admin', 'users', 'list', filters] as const,
      detail: (id: string) => ['system-admin', 'users', id] as const,
    },
  },
};
