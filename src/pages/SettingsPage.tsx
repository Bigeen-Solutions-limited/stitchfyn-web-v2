import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Stack, 
  Tabs, 
  Tab, 
  Paper,
  alpha,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Business as GeneralIcon,
  AccountTree as WorkshopIcon,
  DataUsage as CapacityIcon,
  Shield as ShieldIcon,
  EventRepeat as SeasonalIcon,
} from '@mui/icons-material';
import { WorkshopConfiguration } from '../features/workflow/components/WorkshopConfiguration';
import { GeneralProfileSettings } from '../features/settings/components/GeneralProfileSettings';
import { CapacitySettingsPanel } from '../features/capacity/components/CapacitySettingsPanel';
import { RolePermissionsMatrix } from '../features/settings/components/RolePermissionsMatrix';
import { SeasonalOverridesPanel } from '../features/capacity/components/SeasonalOverridesPanel';
import { ComingSoon } from '../components/feedback/ComingSoon';
import { FEATURES } from '../config/features';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function CustomTabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      style={{ height: '100%' }}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 0, height: '100%' }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export const SettingsPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  return (
    <Box className="container" sx={{ py: 4 }}>
      <header style={{ marginBottom: 40 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <SettingsIcon sx={{ fontSize: 32, color: 'primary.main' }} />
          <Typography 
            variant="h4" 
            className="mobile-page-title" 
            sx={{ 
              fontSize: { xs: '1.25rem', md: '2.125rem' }, 
              fontWeight: 800 
            }}
          >
            Settings Hub
          </Typography>
        </Stack>
        <Typography variant="body1" sx={{ color: 'text.secondary', mt: 1 }}>
          Centralized administration for production workflows and company configuration.
        </Typography>
      </header>

      <Paper className="sf-glass" sx={{ 
        display: 'flex', 
        flexDirection: isMobile ? 'column' : 'row',
        minHeight: '70vh', 
        borderRadius: '32px', 
        overflow: 'hidden',
        border: '1px solid',
        borderColor: 'rgba(255, 255, 255, 0.4)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.05)',
        bgcolor: alpha('#fff', 0.8)
      }}>
        {/* Tab list */}
        <Box sx={{ 
          width: isMobile ? '100%' : 280, 
          borderRight: isMobile ? 'none' : '1px solid', 
          borderBottom: isMobile ? '1px solid' : 'none',
          borderColor: 'divider',
          bgcolor: alpha('#f8fbf9', 0.5),
          p: isMobile ? 1 : 2
        }}>
          {!isMobile && (
            <Typography variant="caption" sx={{ 
              px: 2, 
              py: 1.5, 
              display: 'block', 
              fontWeight: 800, 
              color: 'text.disabled',
              textTransform: 'uppercase',
              letterSpacing: 1.5
            }}>
              Administration
            </Typography>
          )}
          <Tabs
            orientation={isMobile ? "horizontal" : "vertical"}
            variant={isMobile ? "scrollable" : "standard"}
            scrollButtons="auto"
            allowScrollButtonsMobile
            value={activeTab}
            onChange={handleTabChange}
            sx={{
              '& .MuiTabs-indicator': {
                width: isMobile ? undefined : 4,
                height: isMobile ? 4 : undefined,
                borderRadius: isMobile ? '4px 4px 0 0' : '0 4px 4px 0',
                left: isMobile ? undefined : 0,
                bottom: 0,
                bgcolor: 'primary.main'
              },
              '& .MuiTab-root': {
                alignItems: isMobile ? 'center' : 'flex-start',
                textAlign: isMobile ? 'center' : 'left',
                justifyContent: isMobile ? 'center' : 'flex-start',
                minHeight: isMobile ? 48 : 56,
                borderRadius: isMobile ? '8px' : '12px',
                px: 2,
                color: 'text.secondary',
                transition: 'all 0.2s ease',
                '&.Mui-selected': {
                  color: 'primary.main',
                  bgcolor: alpha('#1e5c3a', 0.08),
                },
                '&:hover': {
                  bgcolor: alpha('#1e5c3a', 0.04),
                }
              }
            }}
          >
            <Tab 
              icon={<WorkshopIcon sx={{ mr: 1.5, fontSize: 20 }} />} 
              iconPosition="start" 
              label={<Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Workshop Config</Typography>} 
            />
            <Tab 
              icon={<CapacityIcon sx={{ mr: 1.5, fontSize: 20 }} />} 
              iconPosition="start" 
              label={<Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Capacity Management</Typography>} 
            />
            <Tab
              icon={<GeneralIcon sx={{ mr: 1.5, fontSize: 20 }} />}
              iconPosition="start"
              label={<Typography variant="subtitle2" sx={{ fontWeight: 700 }}>General Profile</Typography>}
            />
            <Tab
              icon={<ShieldIcon sx={{ mr: 1.5, fontSize: 20 }} />}
              iconPosition="start"
              label={<Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Role Permissions</Typography>}
            />
            <Tab
              icon={<SeasonalIcon sx={{ mr: 1.5, fontSize: 20 }} />}
              iconPosition="start"
              label={<Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Seasonal Overrides</Typography>}
            />
          </Tabs>
        </Box>

        {/* Content Pane */}
        <Box sx={{ flex: 1, p: isMobile ? 3 : 6, bgcolor: 'transparent', overflowY: 'auto' }}>
          <CustomTabPanel value={activeTab} index={0}>
            <WorkshopConfiguration />
          </CustomTabPanel>
          <CustomTabPanel value={activeTab} index={1}>
            {FEATURES.capacitySettingsPanel ? (
              <CapacitySettingsPanel />
            ) : (
              <ComingSoon
                title="Capacity settings coming in v1.1"
                description="Configure workshop slot limits, per-workflow capacity budgets, and real-time utilisation targets. Seasonal overrides are available now in the tab below."
              />
            )}
          </CustomTabPanel>
          <CustomTabPanel value={activeTab} index={2}>
            {FEATURES.generalProfileSettings ? (
              <GeneralProfileSettings />
            ) : (
              <ComingSoon
                title="Profile settings coming in v1.1"
                description="Company name, timezone, and measurement unit preferences will be editable here once the settings persistence API is complete."
              />
            )}
          </CustomTabPanel>
          <CustomTabPanel value={activeTab} index={3}>
            <RolePermissionsMatrix />
          </CustomTabPanel>
          <CustomTabPanel value={activeTab} index={4}>
            <SeasonalOverridesPanel />
          </CustomTabPanel>
        </Box>
      </Paper>
    </Box>
  );
};
