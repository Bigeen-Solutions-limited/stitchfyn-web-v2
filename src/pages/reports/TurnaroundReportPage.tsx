import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  reportsApi,
  periodLabel,
  formatHours,
  reportErrorMessage,
  type ReportQuery,
  type TurnaroundGroup,
  type TurnaroundReport,
} from '../../features/reports/reports.api';
import { ReportShell, StatTile, ProportionBar, SectionTitle, EmptyNote } from '../../features/reports/components/ReportParts';
import { QueryLoading, QueryError } from '../../components/feedback/QueryState';
import { keys } from '../../query/keys';
import { downloadCsv, datedFilename } from '../../utils/download';

function GroupTable({ rows, nameHeader }: { rows: TurnaroundGroup[]; nameHeader: string }) {
  const max = Math.max(0, ...rows.map((r) => r.averageHours));
  return (
    <Card sx={{ borderRadius: '16px', border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>{nameHeader}</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>Done</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>Average</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, display: { xs: 'none', sm: 'table-cell' } }}>Typical (median)</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, display: { xs: 'none', sm: 'table-cell' } }}>9 in 10 within</TableCell>
              <TableCell sx={{ fontWeight: 700, width: '28%', display: { xs: 'none', md: 'table-cell' } }}>Average vs slowest</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.key}>
                <TableCell>{r.label}</TableCell>
                <TableCell align="right">{r.completed}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>{formatHours(r.averageHours)}</TableCell>
                <TableCell align="right" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>{formatHours(r.medianHours)}</TableCell>
                <TableCell align="right" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>{formatHours(r.p90Hours)}</TableCell>
                <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                  <ProportionBar
                    value={r.averageHours}
                    max={max}
                    tooltip={`${r.label}: ${formatHours(r.averageHours)} on average over ${r.completed} finished`}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Card>
  );
}

export function TurnaroundReportPage() {
  const [query, setQuery] = useState<ReportQuery>({ period: 'month' });
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: keys.analytics.turnaroundReport(query),
    queryFn: () => reportsApi.turnaround(query),
  });

  const exportReport = (report: TurnaroundReport) =>
    downloadCsv(
      [
        ...report.byStage.map((r) => ({ ...r, group: 'Stage' })),
        ...report.byTailor.map((r) => ({ ...r, group: 'Tailor' })),
      ],
      [
        { header: 'Group', value: (r) => r.group },
        { header: 'Name', value: (r) => r.label },
        { header: 'Finished', value: (r) => r.completed },
        { header: 'Average hours', value: (r) => r.averageHours },
        { header: 'Median hours', value: (r) => r.medianHours },
        { header: '90th percentile hours', value: (r) => r.p90Hours },
      ],
      datedFilename('production-turnaround', 'csv'),
    );

  // Ranked by the typical (median) time, so one forgotten stage can't make a stage look slowest
  const slowest = data?.byStage[0];

  return (
    <ReportShell
      title="Production Turnaround"
      description="Elapsed time from a stage starting (or becoming ready) to its completion, including waiting and blocked time, by stage and by tailor. Only stages finished in the chosen range are counted; dates are Lagos time."
      query={query}
      onQueryChange={setQuery}
      onExport={data ? () => exportReport(data) : undefined}
      canExport={!!data && data.byStage.length > 0}
    >
      {isLoading ? (
        <QueryLoading />
      ) : isError || !data ? (
        <QueryError message={reportErrorMessage(error)} onRetry={() => refetch()} />
      ) : data.totals.completed === 0 ? (
        <EmptyNote>No production stages were finished in this range.</EmptyNote>
      ) : (
        <>
          <Grid container spacing={2}>
            <Grid size={{ xs: 6, md: 4 }}><StatTile label="Stages finished" value={String(data.totals.completed)} /></Grid>
            <Grid size={{ xs: 6, md: 4 }}>
              <StatTile
                label="Typical stage"
                value={formatHours(data.totals.medianHours)}
                note={`${formatHours(data.totals.averageHours)} on average`}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <StatTile
                label="Slowest stage"
                value={slowest ? slowest.label : '-'}
                note={slowest ? `typically ${formatHours(slowest.medianHours)}` : undefined}
              />
            </Grid>
          </Grid>

          {data.excluded > 0 && (
            <EmptyNote>
              {data.excluded} finished {data.excluded === 1 ? 'stage was' : 'stages were'} left out because the completion time is recorded before the start.
            </EmptyNote>
          )}

          <SectionTitle>By stage</SectionTitle>
          <GroupTable rows={data.byStage} nameHeader="Stage" />

          <SectionTitle>By tailor</SectionTitle>
          <GroupTable rows={data.byTailor} nameHeader="Tailor (assigned, else who finished)" />

          <SectionTitle>By {query.period}</SectionTitle>
          <Card sx={{ borderRadius: '16px', border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Period</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Stages finished</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Average</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.periods.map((p) => (
                    <TableRow key={p.period}>
                      <TableCell>{periodLabel(p.period, data.period)}</TableCell>
                      <TableCell align="right">{p.completed}</TableCell>
                      <TableCell align="right">{formatHours(p.averageHours)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </>
      )}
    </ReportShell>
  );
}
