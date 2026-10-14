import React from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Button, 
  Stack, 
  Divider, 
  Alert, 
  AlertTitle,
  Chip
} from '@mui/material';
import { Warning, Gavel, History, CheckCircle } from '@mui/icons-material';
import { useDisputeProjection, useSubmitEvidence, useResolveDispute } from '../dispute.hooks';

interface DisputePortalProps {
  orderId: string;
}

// Shows the dispute status from the server and the evidence and resolution actions
export const DisputePortal: React.FC<DisputePortalProps> = ({ orderId }) => {
  const { data: projection, isLoading } = useDisputeProjection(orderId);
  const { mutate: submitEvidence } = useSubmitEvidence(orderId);
  const { mutate: resolveDispute } = useResolveDispute(orderId);

  if (isLoading || !projection) return null;

  const isFrozen = ['OPEN', 'EVIDENCE_REQUIRED', 'UNDER_REVIEW'].includes(projection.status);

  return (
    <Paper 
      elevation={4} 
      sx={{ 
        p: 3, 
        border: '2px solid',
        borderColor: isFrozen ? 'warning.main' : 'success.main',
        bgcolor: isFrozen ? 'rgba(255, 152, 0, 0.05)' : 'rgba(76, 175, 80, 0.05)',
        borderRadius: 2,
        mt: 2
      }}
    >
      <Stack spacing={2}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" alignItems="center" gap={1}>
            {isFrozen ? <Warning color="warning" /> : <CheckCircle color="success" />}
            <Typography variant="h6" fontWeight="bold">
              Arbitration Standoff: {projection.category}
            </Typography>
          </Box>
          <Chip 
            label={projection.status} 
            color={isFrozen ? "warning" : "success"} 
            variant="filled"
            icon={<Gavel />}
          />
        </Box>

        <Alert severity={isFrozen ? "warning" : "success"} variant="outlined">
          <AlertTitle>{isFrozen ? "Production Frozen" : "Arbitration Resolved"}</AlertTitle>
          {isFrozen 
            ? "A formal dispute has halted the physical workflow. Irreversible work (cutting/sewing) is inhibited until resolution."
            : "This dispute has been settled and verified. Workflow permissions have been restored."}
        </Alert>

        <Box>
          <Typography variant="caption" color="text.secondary">
            Days in Standoff: {projection.daysInStandoff} | Last Activity: {projection.lastActivityAt && projection.lastActivityAt !== 'Invalid Date' ? new Date(projection.lastActivityAt).toLocaleString() : 'Recently updated'}
          </Typography>
        </Box>

        {isFrozen && (
          <Box sx={{ mt: 1, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px dashed grey' }}>
            <Typography variant="subtitle2" gutterBottom>
              Required Action:
            </Typography>
            <Typography variant="body2" color="text.primary" sx={{ mb: 2 }}>
              {projection.requiredAction === 'UPLOAD_PHOTO' && "Please upload photographic evidence of the material/measurement discrepancy."}
              {projection.requiredAction === 'SIGN_AGREEMENT' && "A resolution has been proposed. Both parties must provide consensus sign-off."}
              {projection.requiredAction === 'WAIT_FOR_REVIEW' && "Evidence submitted. The arbitration engine is evaluating the resolution quorum."}
              {projection.requiredAction === 'NONE' && "No pending actions. Production will resume once the system thaws."}
            </Typography>
            
            <Stack direction="row" spacing={1}>
              {projection.requiredAction === 'UPLOAD_PHOTO' && (
                <Button 
                  variant="contained" 
                  color="warning" 
                  size="small"
                  onClick={() => submitEvidence({ 
                    disputeId: projection.disputeId, 
                    evidenceType: 'PHOTO', 
                    artifactUrl: 'https://placeholder.url/dispute-evidence.jpg', 
                    metadata: { source: 'Frontend_DisputePortal' } 
                  })}
                >
                  Upload Evidence
                </Button>
              )}
              {projection.requiredAction === 'SIGN_AGREEMENT' && (
                <Button 
                  variant="contained" 
                  color="success" 
                  size="small"
                  onClick={() => resolveDispute({ 
                    disputeId: projection.disputeId, 
                    resolutionToken: 'CONSENSUS_TOKEN_' + Math.random().toString(36).substr(2, 9) 
                  })}
                >
                  Sign Resolution Agreement
                </Button>
              )}
            </Stack>
          </Box>
        )}

        <Divider />
        
        <Box display="flex" alignItems="center" gap={1}>
          <History fontSize="small" color="action" />
          <Typography variant="subtitle2" color="text.secondary">
            Immutable Arbitration Ledger
          </Typography>
        </Box>
        
        <Box sx={{ opacity: 0.7 }}>
          <Typography variant="body2" color="text.secondary">
            - Dispute Raised: {projection.category} (Initial Standoff)
          </Typography>
          <Typography variant="body2" color="text.secondary">
            - Status Transition: {projection.status} (System Evaluated)
          </Typography>
        </Box>
      </Stack>
    </Paper>
  );
};
