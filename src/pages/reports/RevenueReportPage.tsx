import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  Grid,
  Link,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import { reportsApi, periodLabel, reportErrorMessage, type ReportQuery, type RevenueReport } from '../../features/reports/reports.api';
import { ReportShell, StatTile, ProportionBar, SectionTitle, EmptyNote } from '../../features/reports/components/ReportParts';
import { QueryLoading, QueryError } from '../../components/feedback/QueryState';
import { formatNaira } from '../../features/orders/payments.api';
import { keys } from '../../query/keys';
import { downloadCsv, datedFilename } from '../../utils/download';

const INTENT_LABELS: Record<string, string> = {
  deposit: 'Deposits',
  installment: 'Instalments',
  final: 'Final payments',
  full_upfront: 'Paid upfront',
};
const INTENTS = Object.keys(INTENT_LABELS);

// CSV holds plain naira numbers so spreadsheets can add them up
const naira = (kobo: number) => kobo / 100;

export function RevenueReportPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState<ReportQuery>({ period: 'month' });
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: keys.analytics.revenueReport(query),
    queryFn: () => reportsApi.revenue(query),
  });

  const exportPeriods = (report: RevenueReport) =>
    downloadCsv(
      report.periods,
      [
        { header: 'Period', value: (p) => periodLabel(p.period, report.period) },
        { header: 'Orders', value: (p) => p.orderCount },
        { header: 'Order value (NGN)', value: (p) => naira(p.orderValue) },
        { header: 'Received (NGN)', value: (p) => naira(p.received) },
        ...INTENTS.map((intent) => ({ header: `${INTENT_LABELS[intent]} (NGN)`, value: (p: RevenueReport['periods'][number]) => naira(p.receivedByIntent[intent] ?? 0) })),
      ],
      datedFilename('revenue-by-period', 'csv'),
    );

  const exportOutstanding = (report: RevenueReport) =>
    downloadCsv(
      report.outstandingOrders,
      [
        { header: 'Order #', value: (o) => o.orderNumber },
        { header: 'Customer', value: (o) => o.customerName },
        { header: 'Status', value: (o) => o.status },
        { header: 'Event date', value: (o) => o.eventDate },
        { header: 'Total (NGN)', value: (o) => naira(o.total) },
        { header: 'Paid (NGN)', value: (o) => naira(o.paid) },
        { header: 'Balance (NGN)', value: (o) => naira(o.balance) },
      ],
      datedFilename('outstanding-balances', 'csv'),
    );

  const maxValue = Math.max(0, ...(data?.periods ?? []).map((p) => Math.max(p.orderValue, p.received)));

  return (
    <ReportShell
      title="Revenue & Balances"
      description="What orders were worth, what customers have paid, and who still owes. Order value counts when the order was placed; payments count when they were recorded. Cancelled orders are left out."
      query={query}
      onQueryChange={setQuery}
      onExport={data ? () => exportPeriods(data) : undefined}
      canExport={!!data && data.periods.length > 0}
    >
      {isLoading ? (
        <QueryLoading />
      ) : isError || !data ? (
        <QueryError message={reportErrorMessage(error)} onRetry={() => refetch()} />
      ) : (
        <>
          <Grid container spacing={2}>
            <Grid size={{ xs: 6, md: 3 }}><StatTile label="Orders" value={String(data.totals.orderCount)} /></Grid>
            <Grid size={{ xs: 6, md: 3 }}><StatTile label="Order value" value={formatNaira(data.totals.orderValue)} /></Grid>
            <Grid size={{ xs: 6, md: 3 }}><StatTile label="Received" value={formatNaira(data.totals.received)} /></Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <StatTile label="Still owed" value={formatNaira(data.totals.outstanding)} note={`on ${data.outstandingOrders.length} orders`} />
            </Grid>
          </Grid>

          <SectionTitle>By {query.period}</SectionTitle>
          {data.periods.length === 0 ? (
            <EmptyNote>No orders or payments in this range.</EmptyNote>
          ) : (
            <Card sx={{ borderRadius: '16px', border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Period</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>Orders</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>Order value</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>Received</TableCell>
                      <TableCell sx={{ fontWeight: 700, width: '28%', display: { xs: 'none', md: 'table-cell' } }}>Received vs largest</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.periods.map((p) => (
                      <TableRow key={p.period}>
                        <TableCell>{periodLabel(p.period, data.period)}</TableCell>
                        <TableCell align="right">{p.orderCount}</TableCell>
                        <TableCell align="right">{formatNaira(p.orderValue)}</TableCell>
                        <TableCell align="right">{formatNaira(p.received)}</TableCell>
                        <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                          <ProportionBar
                            value={p.received}
                            max={maxValue}
                            tooltip={INTENTS.filter((i) => p.receivedByIntent[i])
                              .map((i) => `${INTENT_LABELS[i]}: ${formatNaira(p.receivedByIntent[i])}`)
                              .join(' · ') || 'No payments'}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Card>
          )}

          <SectionTitle>Orders still owing</SectionTitle>
          {data.outstandingOrders.length === 0 ? (
            <EmptyNote>Every order placed in this range is fully paid, or has no agreed price yet.</EmptyNote>
          ) : (
            <>
              <Card sx={{ borderRadius: '16px', border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>Order</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Customer</TableCell>
                        <TableCell sx={{ fontWeight: 700, display: { xs: 'none', md: 'table-cell' } }}>Event date</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, display: { xs: 'none', sm: 'table-cell' } }}>Paid</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>Balance</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {data.outstandingOrders.map((o) => (
                        <TableRow key={o.orderId} hover>
                          <TableCell>
                            <Link component="button" onClick={() => navigate(`/orders/${o.orderId}`)} sx={{ fontWeight: 600 }}>
                              #{o.orderNumber}
                            </Link>
                          </TableCell>
                          <TableCell>{o.customerName}</TableCell>
                          <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>{o.eventDate}</TableCell>
                          <TableCell align="right" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                            {formatNaira(o.paid)} of {formatNaira(o.total)}
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700 }}>{formatNaira(o.balance)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Card>
              <Button size="small" onClick={() => exportOutstanding(data)} sx={{ mt: 1, textTransform: 'none', fontWeight: 600 }}>
                Export this list as CSV
              </Button>
            </>
          )}
        </>
      )}
    </ReportShell>
  );
}
