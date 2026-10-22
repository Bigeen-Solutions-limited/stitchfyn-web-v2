import { Box, Grid, Typography } from '@mui/material';

interface Props {
  measurements?: Record<string, number | string> | null;
  // The garment template's required keys; all measurements are shown when it has none
  requiredKeys?: string[];
}

// The measurements a garment needs, shared by the full order page and the tailor's work view
export function MeasurementsGrid({ measurements, requiredKeys }: Props) {
  const orderMeasurements = measurements || {};
  const keys = requiredKeys || [];
  const filteredMeasurements = Object.entries(orderMeasurements).filter(([key]) =>
    keys.length === 0 || keys.includes(key)
  );

  if (filteredMeasurements.length > 0) {
    return (
      <Grid container spacing={2}>
        {filteredMeasurements.map(([key, value]) => (
          <Grid size={{ xs: 4, sm: 3 }} key={key}>
            <Box sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2, bgcolor: 'background.paper' }}>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  display: 'block',
                  mb: 0.5
                }}
              >
                {key.replace(/_/g, ' ')}
              </Typography>
              <Typography variant="body1" color="primary" sx={{ fontWeight: 800 }}>
                {String(value)}
              </Typography>
            </Box>
          </Grid>
        ))}
      </Grid>
    );
  }

  return (
    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', py: 2 }}>
      No measurements recorded for this garment type.
    </Typography>
  );
}
