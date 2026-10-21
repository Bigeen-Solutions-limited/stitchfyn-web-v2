import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Chip,
  Stack,
  Fade,
  Grow
} from '@mui/material';
import {
  Straighten as RulerIcon,
  CalendarMonth as CalendarIcon,
  Groups as UsersIcon
} from '@mui/icons-material';
import splashImage from '../assets/images/splash-image.jpg';
import { BRAND_NAME } from '../config/brand';

export function SplashScreen() {
  const navigate = useNavigate();
  const [startAnimations, setStartAnimations] = useState(false);

  useEffect(() => {
    setStartAnimations(true);
  }, []);

  const handleGetStarted = () => {
    navigate('/login');
  };

  return (
    <Box
      sx={{
        height: '100vh',
        width: '100vw',
        position: 'relative',
        overflow: 'hidden',
        bgcolor: '#163d28',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundImage: `url(${splashImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(to bottom, rgba(22, 61, 40, 0.82) 0%, rgba(22, 61, 40, 0.55) 100%)',
          zIndex: 1,
        },
      }}
    >
      <Box sx={{ zIndex: 2, textAlign: 'center', px: 3, maxWidth: 650 }}>
        {/* Logo Lockup */}
        <Fade in={startAnimations} timeout={300} style={{ transitionDelay: '100ms' }}>
          <Box sx={{
            mb: 4,
            transform: startAnimations ? 'translateY(0)' : 'translateY(-20px)',
            transition: 'transform 300ms ease-out 100ms',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2
          }}>
            <Box
              component="img"
              src="/logo-full.png"
              alt={BRAND_NAME}
              sx={{ height: { xs: 36, md: 44 }, width: 'auto' }}
            />
          </Box>
        </Fade>

        <Fade in={startAnimations} timeout={400} style={{ transitionDelay: '200ms' }}>
          <Box sx={{ mb: 2, transform: startAnimations ? 'translateY(0)' : 'translateY(20px)', transition: 'transform 400ms ease-out 200ms' }}>
            <Typography
              variant="h1"
              sx={{
                color: 'white',
                fontWeight: 800,
                fontSize: { xs: '40px', md: '56px' },
                lineHeight: 1.1,
                letterSpacing: '-0.02em'
              }}
            >
              Organize Your Shop.
            </Typography>
          </Box>
        </Fade>

        <Fade in={startAnimations} timeout={400} style={{ transitionDelay: '350ms' }}>
          <Typography
            variant="body1"
            sx={{
              color: 'rgba(255, 255, 255, 0.8)',
              mb: 4,
              mx: 'auto',
              maxWidth: 480,
              fontSize: '18px',
              fontWeight: 400
            }}
          >
            Professional order management for modern tailors. Streamline measurements, client profiles, and delivery dates.
          </Typography>
        </Fade>

        {/* Divider bar */}
        <Box
          sx={{
            width: startAnimations ? '60px' : '0px',
            height: '3px',
            bgcolor: '#c49a1a',
            borderRadius: '999px',
            mx: 'auto',
            mb: 5,
            transition: 'width 300ms ease-out 400ms'
          }}
        />

        {/* Feature chips row */}
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          justifyContent="center"
          sx={{ mb: 6 }}
        >
          {[
            { icon: <RulerIcon />, label: 'Digital Measurements' },
            { icon: <CalendarIcon />, label: 'Order Scheduling' },
            { icon: <UsersIcon />, label: 'Client CRM' }
          ].map((chip, index) => (
            <Fade key={index} in={startAnimations} timeout={400} style={{ transitionDelay: `${500 + index * 100}ms` }}>
              <Chip
                icon={React.cloneElement(chip.icon as React.ReactElement<any>, { sx: { color: 'white !important', fontSize: '20px' } })}

                label={chip.label}
                sx={{
                  bgcolor: 'rgba(255, 255, 255, 0.12)',
                  color: 'white',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '999px',
                  py: 2.5,
                  px: 1,
                  '& .MuiChip-label': { fontSize: '14px', fontWeight: 500 }
                }}
              />
            </Fade>
          ))}
        </Stack>

        <Grow in={startAnimations} timeout={300} style={{ transitionDelay: '600ms' }}>
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <Button
              variant="contained"
              onClick={handleGetStarted}
              sx={{
                bgcolor: '#1e5c3a',
                color: 'white',
                borderRadius: '999px',
                height: '52px',
                px: { xs: 0, md: 8 },
                width: { xs: '100%', md: '280px' },
                fontSize: '16px',
                fontWeight: 600,
                textTransform: 'none',
                boxShadow: '0 0 20px rgba(30, 92, 58, 0.4)',
                transition: 'all 0.2s ease',
                '&:hover': {
                  bgcolor: '#256b45',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 4px 25px rgba(30, 92, 58, 0.6)',
                }
              }}
            >
              Get Started
            </Button>
          </Box>
        </Grow>
      </Box>
    </Box>
  );
}
