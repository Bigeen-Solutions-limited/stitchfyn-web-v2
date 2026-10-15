import React from 'react';
import {
  Box,
  Typography,
  Stack,
  Avatar,
  Chip,
  alpha,
  Tooltip
} from '@mui/material';
import {
  History as HistoryIcon,
  Warning as WarningIcon,
  VerifiedUser as VerifiedUserIcon,
  ShoppingBag as ShoppingBagIcon,
  Engineering as EngineeringIcon,
  Security as SecurityIcon,
  EventNote as EventNoteIcon,
  Checkroom as ChecklistIcon,
  CheckCircleOutline as CheckCircleOutlineIcon,
  PhotoCameraOutlined as PhotoCameraOutlinedIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../infrastructure/http/axios.client';
import type { AuditRecord } from '../types';

interface AuditTrailTimelineProps {
  targetId?: string;
  // One garment's history; takes priority over targetId and uses a different endpoint
  contextId?: string;
  // Optional heading, e.g. "Material Audit Trail" for one garment
  title?: string;
}

// Read-only audit history, ordered by when the server recorded each event; flags events recorded over an hour after they happened.
export const AuditTrailTimeline: React.FC<AuditTrailTimelineProps> = ({ targetId, contextId, title }) => {
  const { data: records, isLoading } = useQuery({
    queryKey: ['audit-trail', contextId ? `context:${contextId}` : targetId ? `target:${targetId}` : 'all'],
    queryFn: async () => {
      const url = contextId
        ? `/audit/context/${contextId}`
        : targetId
          ? `/audit/target/${targetId}`
          : '/audit';
      const { data } = await apiClient.get<AuditRecord[]>(url);
      return data;
    },
  });

  if (isLoading) return <Typography variant="caption">Synchronizing Audit Records...</Typography>;
  if (!records || records.length === 0) return null;

  const getActionStyles = (action: string) => {
    switch (action) {
      case 'ORDER_CREATED':
        return { icon: <ShoppingBagIcon fontSize="small" />, color: '#2196f3', label: 'Order Created' };
      case 'GARMENT_PRODUCTION_CHANGED':
        return { icon: <EngineeringIcon fontSize="small" />, color: '#4caf50', label: 'Production Update' };
      case 'WORKFLOW_INHIBITED':
        return { icon: <WarningIcon fontSize="small" />, color: '#f44336', label: 'Production Halted' };
      case 'FABRIC_INTAKE_RECORDED':
        return { icon: <ChecklistIcon fontSize="small" />, color: '#c49a1a', label: 'Fabric Intake Recorded' };
      case 'FABRIC_CONFIRMED':
        return { icon: <CheckCircleOutlineIcon fontSize="small" />, color: '#1e5c3a', label: 'Fabric Confirmed' };
      case 'FABRIC_EVIDENCE_RECORDED':
        return { icon: <PhotoCameraOutlinedIcon fontSize="small" />, color: '#8d6e63', label: 'Fabric Evidence Recorded' };
      default:
        return { icon: <HistoryIcon fontSize="small" />, color: '#757575', label: action.replace(/_/g, ' ') };
    }
  };

  return (
    <Box sx={{ mt: 3 }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 3 }}>
        <VerifiedUserIcon sx={{ color: 'primary.main', fontSize: 20 }} />
        <Typography variant="subtitle2" fontWeight={800} sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {title ?? 'Immutable Audit Trail'}
        </Typography>
      </Stack>

      <Stack spacing={0}>
        {records.map((record, index) => {
          const styles = getActionStyles(record.action);
          const witnessed = new Date(record.witnessedAt);
          const occurred = new Date(record.occurredAt);
          
          // Flag events recorded more than an hour after they happened
          const driftMs = Math.abs(witnessed.getTime() - occurred.getTime());
          const hasDrift = driftMs > 3600000;

          return (
            <Box key={record.id} sx={{ display: 'flex', position: 'relative', pb: 4 }}>
              {index < records.length - 1 && (
                <Box sx={{ 
                  position: 'absolute', 
                  left: 19, 
                  top: 40, 
                  bottom: 0, 
                  width: '2px', 
                  bgcolor: 'divider', 
                  zIndex: 0 
                }} />
              )}

              <Avatar 
                sx={{ 
                  width: 40, 
                  height: 40, 
                  bgcolor: alpha(styles.color, 0.1), 
                  color: styles.color,
                  zIndex: 1,
                  mr: 2,
                  border: '1px solid',
                  borderColor: alpha(styles.color, 0.2)
                }}
              >
                {styles.icon}
              </Avatar>

              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 0.5 }}>
                  <Typography variant="body2" fontWeight={700}>
                    {styles.label}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.disabled', fontFamily: 'monospace' }}>
                    {witnessed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Typography>
                </Stack>

                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                  Actor: {record.actorId || 'System'}
                </Typography>

                {/* Metadata Tags */}
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
                  {Object.entries(record.metadata).map(([key, value]) => (
                    <Chip 
                      key={key} 
                      label={`${key}: ${value}`} 
                      size="small" 
                      variant="outlined"
                      sx={{ 
                        fontSize: '10px', 
                        height: '20px', 
                        borderColor: 'divider',
                        bgcolor: 'background.paper',
                        maxWidth: '100%',
                      }} 
                      title={`${key}: ${value}`}
                    />
                  ))}
                </Stack>

                <Stack direction="row" spacing={2} alignItems="center">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <EventNoteIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                    <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '10px' }}>
                      Witnessed: {witnessed.toLocaleDateString()}
                    </Typography>
                  </Box>
                  
                  {hasDrift && (
                    <Tooltip title={`Temporal Drift Detected: Clock difference is ${Math.round(driftMs / 60000)} minutes. Possible offline sync or device clock manipulation.`}>
                      <Chip
                        icon={<WarningIcon sx={{ fontSize: '12px !important' }} />}
                        label="Temporal Drift Warning"
                        size="small"
                        color="warning"
                        sx={{ 
                          height: '20px', 
                          fontSize: '10px', 
                          fontWeight: 800,
                          borderRadius: '4px'
                        }}
                      />
                    </Tooltip>
                  )}
                </Stack>

                {/* Signature */}
                <Box sx={{ mt: 1.5, p: 1, bgcolor: alpha('#000', 0.02), borderRadius: 1, border: '1px dashed', borderColor: 'divider' }}>
                   <Stack direction="row" spacing={1} alignItems="center">
                      <SecurityIcon sx={{ fontSize: 10, color: 'text.disabled' }} />
                      <Typography variant="caption" sx={{ fontSize: '9px', color: 'text.disabled', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                        SIG: {record.signature.substring(0, 32)}...
                      </Typography>
                   </Stack>
                </Box>
              </Box>
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
};
