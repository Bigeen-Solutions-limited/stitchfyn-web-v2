import { apiClient } from '../../infrastructure/http/axios.client';

// Money is in kobo, like everywhere else; format with formatNaira
export type ReportPeriod = 'month' | 'quarter';

export interface ReportQuery {
  period: ReportPeriod;
  from?: string; // YYYY-MM-DD
  to?: string; // YYYY-MM-DD, inclusive
}

export interface RevenueReport {
  from: string;
  to: string; // exclusive
  period: ReportPeriod;
  totals: { orderCount: number; orderValue: number; received: number; outstanding: number };
  periods: {
    period: string;
    orderCount: number;
    orderValue: number;
    received: number;
    receivedByIntent: Record<string, number>;
  }[];
  outstandingOrders: {
    orderId: string;
    orderNumber: number;
    customerName: string;
    status: string;
    eventDate: string;
    total: number;
    paid: number;
    balance: number;
  }[];
}

export interface TurnaroundGroup {
  key: string;
  label: string;
  completed: number;
  averageHours: number;
  medianHours: number;
  // 9 in 10 finished within this
  p90Hours: number;
}

export interface TurnaroundReport {
  from: string;
  to: string;
  period: ReportPeriod;
  totals: { completed: number; averageHours: number; medianHours: number };
  // Finished stages left out because their completion is recorded before their start
  excluded: number;
  byStage: TurnaroundGroup[];
  byTailor: TurnaroundGroup[];
  periods: { period: string; completed: number; averageHours: number }[];
}

export const reportsApi = {
  revenue: async (query: ReportQuery) => {
    const { data } = await apiClient.get<RevenueReport>('/analytics/reports/revenue', { params: query });
    return data;
  },
  turnaround: async (query: ReportQuery) => {
    const { data } = await apiClient.get<TurnaroundReport>('/analytics/reports/turnaround', { params: query });
    return data;
  },
};

// "2026-04-01" -> "Apr 2026" or "Q2 2026"
export function periodLabel(period: string, kind: ReportPeriod): string {
  const [year, month] = period.split('-').map(Number);
  if (kind === 'quarter') return `Q${Math.floor((month - 1) / 3) + 1} ${year}`;
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleString('en-NG', { month: 'short', year: 'numeric', timeZone: 'UTC' });
}

// Hours as a tailor would say it: "45 min", "6.5 h", "2.3 days"
export function formatHours(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (hours < 48) return `${Math.round(hours * 10) / 10} h`;
  return `${Math.round((hours / 24) * 10) / 10} days`;
}

// The server explains a bad date range; anything else gets the generic message
export function reportErrorMessage(error: unknown): string | undefined {
  return (error as { response?: { data?: { message?: string } } } | null)?.response?.data?.message;
}
