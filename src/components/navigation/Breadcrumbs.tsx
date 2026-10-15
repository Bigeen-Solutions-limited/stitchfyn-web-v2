import React from 'react';
import { Breadcrumbs as MuiBreadcrumbs, Typography, Link, Box, alpha } from '@mui/material';
import { ChevronRight, Home } from '@mui/icons-material';
import { useLocation, Link as RouterLink } from 'react-router-dom';
import { labelFor } from './pageTitles';

export const Breadcrumbs: React.FC = () => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  if (pathnames.length === 0) return null;

  return (
    <Box sx={{ mb: 0.5, display: { xs: 'none', md: 'block' } }}>
      <MuiBreadcrumbs 
        separator={<ChevronRight sx={{ fontSize: 14, color: 'text.disabled' }} />}
        aria-label="breadcrumb"
      >
        <Link
          component={RouterLink}
          to="/dashboard"
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            color: 'text.secondary',
            textDecoration: 'none',
            fontSize: '0.75rem',
            fontWeight: 500,
            '&:hover': { color: 'primary.main' }
          }}
        >
          <Home sx={{ mr: 0.5, fontSize: 14 }} />
          Home
        </Link>
        {pathnames.map((value, index) => {
          const last = index === pathnames.length - 1;
          const to = `/${pathnames.slice(0, index + 1).join('/')}`;
          const label = labelFor(value);

          return last ? (
            <Typography 
              key={to} 
              sx={{ 
                fontSize: '0.75rem', 
                fontWeight: 700, 
                color: 'primary.main',
                bgcolor: alpha('#1e5c3a', 0.05),
                px: 1,
                py: 0.2,
                borderRadius: '4px'
              }}
            >
              {label}
            </Typography>
          ) : (
            <Link
              key={to}
              component={RouterLink}
              to={to}
              sx={{ 
                color: 'text.secondary', 
                textDecoration: 'none',
                fontSize: '0.75rem',
                fontWeight: 500,
                '&:hover': { color: 'primary.main' }
              }}
            >
              {label}
            </Link>
          );
        })}
      </MuiBreadcrumbs>
    </Box>
  );
};
