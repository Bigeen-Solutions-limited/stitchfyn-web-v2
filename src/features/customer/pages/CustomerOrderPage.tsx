import { useParams } from 'react-router-dom';
import { Box, Card, Chip, CircularProgress, Grid, Stack, Typography } from '@mui/material';
import { useCustomerOrder, usePortalStageTimeline } from '../hooks/useCustomerOrder';
import { StageTimelineView } from '../../workflow/components/WorkflowStageTimeline';
import { RiskBadge } from '../../../components/ui/RiskBadge';
import { StageStepper } from '../../../components/ui/StageStepper';
import { PortalPaymentSummary } from '../../portal/components/PortalPaymentSummary';
import { PortalMessageThread } from '../../portal/components/PortalMessageThread';
import { PortalCollectionSignoff } from '../../portal/components/PortalCollectionSignoff';
import { PortalDesignBriefConfirm } from '../../portal/components/PortalDesignBriefConfirm';
import { PortalFabricConfirm } from '../../portal/components/PortalFabricConfirm';
import { PortalDisputeSurface } from '../../portal/components/PortalDisputeSurface';
import { formatDeadline } from '../../../utils/format';

const cardSx = { p: { xs: 2.5, md: 3 }, borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: 'none' } as const;

// The API sends calendar dates as YYYY-MM-DD; show them as "Oct 22, 2026", and anything else as sent
function friendlyDate(value: string | null | undefined): string {
  if (!value) return 'To be confirmed';
  return /^\d{4}-\d{2}-\d{2}/.test(value) ? formatDeadline(value) : value;
}

// The customer's own order, opened from the link the workshop sent them
export function CustomerOrderPage() {
  const { id } = useParams<{ id: string }>();
  const { data: order, isLoading, error } = useCustomerOrder(id || '');
  // The same stage timeline staff see, with its photos, for each garment
  const { data: garmentTimelines = [] } = usePortalStageTimeline(id || '');

  if (isLoading) {
    return (
      <Stack alignItems="center" spacing={2} sx={{ py: 10 }}>
        <CircularProgress size={28} />
        <Typography color="text.secondary">Loading your order...</Typography>
      </Stack>
    );
  }
  if (error || !order) {
    return (
      <Box sx={{ py: 10, px: 2, textAlign: 'center' }}>
        <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>We couldn't open this order</Typography>
        <Typography color="text.secondary">
          The link may be incomplete or out of date. Please ask your tailor to send it again.
        </Typography>
      </Box>
    );
  }

  return (
    <Stack spacing={3} sx={{ maxWidth: 1100, mx: 'auto', px: { xs: 2, md: 3 }, py: { xs: 3, md: 4 } }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'flex-end' }}
        spacing={2}
        sx={{ pb: 2, borderBottom: '1px solid', borderColor: 'divider' }}
      >
        <Box>
          <Typography variant="h4" fontWeight={800} sx={{ fontSize: { xs: '1.6rem', md: '2.1rem' } }}>
            Order #{order.orderNumber}
          </Typography>
          <Typography color="text.secondary">
            {order.garmentType} for {order.customerName}
          </Typography>
        </Box>
        <Box sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
          <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', display: 'block', mb: 0.5 }}>
            Status
          </Typography>
          <RiskBadge level={order.riskLevel} />
        </Box>
      </Stack>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Stack spacing={3}>
            <Card sx={{ ...cardSx, borderColor: 'primary.main' }}>
              <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 700 }}>
                Estimated handover
              </Typography>
              <Typography variant="h5" fontWeight={800} color="primary" sx={{ my: 1 }}>
                {friendlyDate(order.estimatedCompletion)}
              </Typography>
              <Typography variant="body2" color="text.secondary">Your event: {friendlyDate(order.deadline)}</Typography>
            </Card>

            <Card sx={cardSx}>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Production status</Typography>
              <StageStepper
                totalStages={order.stages.length}
                currentStage={order.activeStageIndex}
                status={order.isWarning ? 'WARNING' : 'NORMAL'}
              />
            </Card>
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, md: 8 }}>
          <Card sx={cardSx}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Production timeline</Typography>
            {garmentTimelines.length > 0 ? (
              <Stack spacing={3}>
                {garmentTimelines.map((g) => (
                  <Box key={g.garmentId}>
                    {garmentTimelines.length > 1 && (
                      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>{g.garmentName}</Typography>
                    )}
                    <StageTimelineView
                      stages={g.stages.map((st) => ({ ...st, key: `${g.garmentId}-${st.stageId}` }))}
                      photos={g.photos}
                    />
                  </Box>
                ))}
              </Stack>
            ) : (
              <Stack spacing={1.5}>
                {order.stages.map((stage, index) => (
                  <Stack key={stage.id} direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Stage {index + 1} of {order.stages.length}</Typography>
                      <Typography
                        fontWeight={stage.isActive ? 700 : 500}
                        sx={{ color: stage.isComplete ? 'text.secondary' : 'text.primary' }}
                      >
                        {stage.name}
                      </Typography>
                    </Box>
                    {stage.isComplete ? (
                      <Chip size="small" color="success" label="Complete" />
                    ) : stage.isActive ? (
                      <Chip size="small" color="warning" label="In progress" />
                    ) : (
                      <Chip size="small" variant="outlined" label="Upcoming" />
                    )}
                  </Stack>
                ))}
              </Stack>
            )}
          </Card>
        </Grid>
      </Grid>

      {/* Fabric comes before design, matching the activation steps */}
      {order.fabricGarments.map((garment) => (
        <PortalFabricConfirm key={garment.garmentId} portalToken={id || ''} garment={garment} />
      ))}

      {order.designBriefs.map((brief) => (
        <PortalDesignBriefConfirm key={brief.id} portalToken={id || ''} brief={brief} />
      ))}

      <PortalCollectionSignoff portalToken={id || ''} />

      <PortalDisputeSurface portalToken={id || ''} />

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <PortalPaymentSummary portalToken={id || ''} />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <PortalMessageThread portalToken={id || ''} />
        </Grid>
      </Grid>
    </Stack>
  );
}
