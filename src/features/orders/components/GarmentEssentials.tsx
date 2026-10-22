import { Avatar, Box, Grid, Stack, Typography } from '@mui/material';
import type { Garment } from '../orders.api';

// Fabric, swatch, quantity and design notes for one garment, shared by the full order page and the tailor's work view
export function GarmentEssentials({ garment }: { garment: Pick<Garment, 'fabricImageBase64' | 'fabricType' | 'colorSwatch' | 'quantity' | 'quantityUnit' | 'designNotes'> }) {
  return (
    <Grid container spacing={4}>
      <Grid size={{ xs: 12, md: 4 }}>
        <Typography variant="caption" color="text.secondary" fontWeight={800} sx={{ textTransform: 'uppercase', mb: 1, display: 'block' }}>
          Fabric Reference
        </Typography>
        <Stack direction="row" spacing={2} alignItems="center">
          <Avatar
            variant="rounded"
            src={garment.fabricImageBase64 || undefined}
            sx={{
              width: 80,
              height: 80,
              borderRadius: 2,
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              bgcolor: 'primary.light',
              border: '1px solid',
              borderColor: 'divider',
              '& img': { objectFit: 'cover' }
            }}
            className="sf-glass"
          >
            {garment.fabricType?.charAt(0) || 'F'}
          </Avatar>
          <Box>
            <Typography variant="subtitle1" fontWeight={700}>
              {garment.fabricType || 'Standard Fabric'}
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
              <Box
                sx={{
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  bgcolor: garment.colorSwatch || '#eee',
                  border: '1px solid rgba(0,0,0,0.1)'
                }}
              />
              <Typography variant="caption" color="text.secondary">
                {garment.colorSwatch || 'No Swatch'}
              </Typography>
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              {garment.quantity != null && garment.quantityUnit
                ? `Qty: ${garment.quantity} ${garment.quantityUnit}`
                : 'Qty: not recorded'}
            </Typography>
          </Box>
        </Stack>
      </Grid>

      <Grid size={{ xs: 12, sm: 8 }}>
        <Typography variant="caption" color="text.secondary" fontWeight={800} sx={{ textTransform: 'uppercase', mb: 1, display: 'block' }}>
          Design Notes
        </Typography>
        <Box sx={{ p: 2, bgcolor: 'rgba(0,0,0,0.02)', borderRadius: 2, minHeight: 80 }} className="sf-glass">
          <Typography variant="body2" sx={{ fontStyle: garment.designNotes ? 'normal' : 'italic', color: garment.designNotes ? 'text.primary' : 'text.secondary' }}>
            {garment.designNotes || 'No custom design notes provided for this garment.'}
          </Typography>
        </Box>
      </Grid>
    </Grid>
  );
}
