import React from 'react';
import { Box, Typography, Alert, AlertTitle, Grid, Card, CardContent } from '@mui/material';
import { Shield, DataUsage, AutoGraph } from '@mui/icons-material';

export const CapacitySettingsPanel: React.FC = () => {
  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, color: 'primary.main', mb: 1 }}>
          Capacity & Workload Shield
        </Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary' }}>
          Configure structural workshop limits to protect production from phantom load and overbooking.
        </Typography>
      </Box>

      <Alert severity="info" icon={<Shield />} sx={{ mb: 4, borderRadius: '12px' }}>
        <AlertTitle sx={{ fontWeight: 700 }}>Check-And-Set (CAS) Guards Active</AlertTitle>
        The CapacityService acts as a Financial Shield against "Phantom Load". Standard and bespoke slot allocations are secured via atomic locking primitives.
      </Alert>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card className="sf-glass-card" sx={{ borderRadius: '16px', boxShadow: 'none', border: '1px solid', borderColor: 'divider' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                <DataUsage color="primary" />
                <Typography variant="h6" sx={{ fontWeight: 700 }}>Total Workshop Slots</Typography>
              </Stack>
              <Typography variant="h3" sx={{ fontWeight: 800, color: 'text.primary', mb: 1 }}>
                100 <Typography component="span" variant="body1" color="text.secondary">slots/month</Typography>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Maximum structural capacity across all workflows.
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card className="sf-glass-card" sx={{ borderRadius: '16px', boxShadow: 'none', border: '1px solid', borderColor: 'divider' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                <AutoGraph color="warning" />
                <Typography variant="h6" sx={{ fontWeight: 700 }}>Active Tokens</Typography>
              </Stack>
              <Typography variant="h3" sx={{ fontWeight: 800, color: 'text.primary', mb: 1 }}>
                24 <Typography component="span" variant="body1" color="text.secondary">slots reserved</Typography>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Currently committed via valid capacity tokens.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

import { Stack } from '@mui/material';
