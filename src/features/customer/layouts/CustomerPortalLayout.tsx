import { Outlet } from 'react-router-dom';
import { Box, Typography } from '@mui/material';

export function CustomerPortalLayout() {
  return (
    <Box className="customer-portal sf-bg-workshop" sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Box
        component="nav"
        className="sf-glass-nav"
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 2,
          px: { xs: 2, md: 4 },
          py: 1.5,
          mb: { xs: 3, md: 5 },
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
          <Box component="img" src="/logo-icon.png" alt="" sx={{ height: 28, width: 'auto' }} />
          <Typography
            noWrap
            sx={{ fontFamily: 'var(--sf-font-display)', fontWeight: 600, fontSize: '1.4rem', color: '#1e5c3a', lineHeight: 1 }}
          >
            StitchFYN
          </Typography>
        </Box>
        <Typography variant="caption" noWrap sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
          Customer Access
        </Typography>
      </Box>

      <Box component="main" sx={{ flex: 1, width: '100%', maxWidth: 1100, mx: 'auto', px: { xs: 2, md: 4 }, pb: 5 }}>
        <Outlet />
      </Box>

      <Box component="footer" sx={{ py: 3, px: 2, borderTop: '1px solid', borderColor: 'divider', textAlign: 'center' }}>
        <Typography variant="caption" color="text.secondary">
          © {new Date().getFullYear()} StitchFYN. Secure read-only view of your order.
        </Typography>
      </Box>
    </Box>
  );
}
