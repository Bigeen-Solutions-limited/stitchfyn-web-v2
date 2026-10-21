import React from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardActionArea,
  Breadcrumbs,
  Link,
  Stack,
  alpha,
  Chip,
} from '@mui/material';
import {
  History as HistoryIcon,
  Description as DescriptionIcon,
  Timeline as TimelineIcon,
  BarChart as BarChartIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const ReportsPage: React.FC = () => {
  const navigate = useNavigate();

  const reportCards = [
    {
      title: 'System Audit Log',
      description: 'Review a chronological record of all critical system transactions and lifecycle events.',
      icon: HistoryIcon,
      path: '/reports/audit',
      status: 'AVAILABLE',
      color: '#1e5c3a',
    },
    {
      title: 'Revenue & Balances',
      description: 'Order value, payments received and outstanding balances, by month or quarter.',
      icon: BarChartIcon,
      path: '/reports/revenue',
      status: 'AVAILABLE',
      color: '#1e5c3a',
    },
    {
      title: 'Production Turnaround',
      description: 'How long each stage takes, per stage and per tailor, and where work slows down.',
      icon: TimelineIcon,
      path: '/reports/turnaround',
      status: 'AVAILABLE',
      color: '#1e5c3a',
    },
  ];

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1200, mx: 'auto' }}>
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link
          component="button"
          onClick={() => navigate('/dashboard')}
          sx={{ color: '#6b7280', textDecoration: 'none', fontSize: '14px', '&:hover': { color: '#1e5c3a' } }}
        >
          Dashboard
        </Link>
        <Typography color="text.primary" sx={{ fontSize: '14px', fontWeight: 500 }}>Reports</Typography>
      </Breadcrumbs>

      <Box sx={{ mb: 6 }}>
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 1 }}>
          <DescriptionIcon sx={{ color: '#1a2340', fontSize: 32 }} />
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#1a2340', letterSpacing: '-0.02em' }}>
            Analytics & Reports
          </Typography>
        </Stack>
        <Typography variant="body1" sx={{ color: '#6b7280', maxWidth: '700px' }}>
          Comprehensive insights into factory performance, inventory movements, and system integrity.
          Access real-time telemetry and periodic operational summaries below.
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {reportCards.map((report) => (
          <Grid size={{ xs: 12, md: 4 }} key={report.title}>
            <Card
              className="sf-glass"
              sx={{
                height: '100%',
                borderRadius: '20px',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
                overflow: 'hidden',
                bgcolor: 'rgba(255, 255, 255, 0.4)',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                '&:hover': report.status === 'AVAILABLE' ? {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 12px 40px 0 rgba(31, 38, 135, 0.12)',
                } : {},
              }}
            >
              <CardActionArea
                onClick={() => report.status === 'AVAILABLE' && navigate(report.path)}
                disabled={report.status !== 'AVAILABLE'}
                sx={{ p: 4, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}
              >
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: '12px',
                    bgcolor: report.status === 'AVAILABLE' ? alpha(report.color, 0.1) : '#f3f4f6',
                    color: report.status === 'AVAILABLE' ? report.color : '#9ca3af',
                    mb: 3,
                  }}
                >
                  <report.icon sx={{ fontSize: 28 }} />
                </Box>

                <Box sx={{ mb: 'auto' }}>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: report.status === 'AVAILABLE' ? '#1a2340' : '#9ca3af' }}>
                      {report.title}
                    </Typography>
                    {report.status === 'COMING_SOON' && (
                      <Chip
                        label="Coming Soon"
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: '10px',
                          fontWeight: 700,
                          bgcolor: alpha('#6b7280', 0.1),
                          color: '#6b7280',
                          borderRadius: '4px',
                        }}
                      />
                    )}
                  </Stack>
                  <Typography variant="body2" sx={{ color: '#6b7280', lineHeight: 1.6 }}>
                    {report.description}
                  </Typography>
                </Box>

                {report.status === 'AVAILABLE' && (
                  <Box sx={{ mt: 3, display: 'flex', alignItems: 'center', gap: 1, color: report.color }}>
                    <Typography variant="button" sx={{ fontWeight: 700, fontSize: '12px' }}>
                      Access Report
                    </Typography>
                    <Box component="span" sx={{ fontSize: '18px' }}>→</Box>
                  </Box>
                )}
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default ReportsPage;
