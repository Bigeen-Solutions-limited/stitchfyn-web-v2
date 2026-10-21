import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Breadcrumbs,
  Button,
  Card,
  Link,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
  alpha,
} from '@mui/material';
import { FileDownload as FileDownloadIcon } from '@mui/icons-material';
import type { ReportPeriod, ReportQuery } from '../reports.api';

const INK = '#1a2340';
const MUTED = '#6b7280';
const BAR = '#1e5c3a'; // one series per bar column, so one brand hue

interface ShellProps {
  title: string;
  description: string;
  query: ReportQuery;
  onQueryChange: (query: ReportQuery) => void;
  onExport?: () => void;
  canExport: boolean;
  children: React.ReactNode;
}

// Breadcrumb, title, and the filters in one row above the report
export function ReportShell({ title, description, query, onQueryChange, onExport, canExport, children }: ShellProps) {
  const navigate = useNavigate();
  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1200, mx: 'auto' }}>
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link component="button" onClick={() => navigate('/reports')} sx={{ color: MUTED, textDecoration: 'none', fontSize: '14px' }}>
          Reports
        </Link>
        <Typography color="text.primary" sx={{ fontSize: '14px', fontWeight: 500 }}>{title}</Typography>
      </Breadcrumbs>

      <Typography variant="h4" sx={{ fontWeight: 800, color: INK, letterSpacing: '-0.02em', fontSize: { xs: '1.5rem', md: '2.125rem' } }}>
        {title}
      </Typography>
      <Typography variant="body1" sx={{ color: MUTED, mb: 3, maxWidth: 720 }}>{description}</Typography>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 3 }} alignItems={{ sm: 'center' }}>
        <TextField
          select
          size="small"
          label="Group by"
          value={query.period}
          onChange={(e) => onQueryChange({ ...query, period: e.target.value as ReportPeriod })}
          sx={{ minWidth: 140 }}
        >
          <MenuItem value="month">Month</MenuItem>
          <MenuItem value="quarter">Quarter</MenuItem>
        </TextField>
        <TextField
          type="date"
          size="small"
          label="From"
          value={query.from ?? ''}
          onChange={(e) => onQueryChange({ ...query, from: e.target.value || undefined })}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          type="date"
          size="small"
          label="To"
          value={query.to ?? ''}
          onChange={(e) => onQueryChange({ ...query, to: e.target.value || undefined })}
          InputLabelProps={{ shrink: true }}
        />
        <Box sx={{ flex: 1 }} />
        {onExport && (
          <Button
            variant="outlined"
            startIcon={<FileDownloadIcon />}
            onClick={onExport}
            disabled={!canExport}
            sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 600 }}
          >
            Export CSV
          </Button>
        )}
      </Stack>

      {children}
    </Box>
  );
}

export function StatTile({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <Card sx={{ p: 2.5, borderRadius: '16px', border: '1px solid', borderColor: 'divider', boxShadow: 'none', height: '100%' }}>
      <Typography variant="caption" sx={{ color: MUTED, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: { xs: '1.4rem', md: '1.75rem' }, fontWeight: 800, color: INK, mt: 0.5 }}>{value}</Typography>
      {note && <Typography variant="caption" sx={{ color: MUTED }}>{note}</Typography>}
    </Card>
  );
}

// A thin horizontal bar showing a value against the largest in its column; the number beside it carries the reading
export function ProportionBar({ value, max, tooltip }: { value: number; max: number; tooltip: string }) {
  const width = max > 0 ? Math.max((value / max) * 100, value > 0 ? 2 : 0) : 0;
  return (
    <Tooltip title={tooltip} placement="top" arrow>
      <Box sx={{ py: 0.75, cursor: 'default' }}>
        <Box sx={{ height: 8, borderRadius: '4px', bgcolor: alpha(BAR, 0.08) }}>
          <Box sx={{ height: '100%', width: `${width}%`, bgcolor: BAR, borderRadius: '4px' }} />
        </Box>
      </Box>
    </Tooltip>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: INK, mt: 4, mb: 1.5 }}>
      {children}
    </Typography>
  );
}

export function EmptyNote({ children }: { children: React.ReactNode }) {
  return (
    <Typography variant="body2" sx={{ color: MUTED, fontStyle: 'italic', py: 3 }}>
      {children}
    </Typography>
  );
}
