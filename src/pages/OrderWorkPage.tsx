import { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Box, Button, Card, Chip, Stack, Tab, Tabs, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import TimelineIcon from '@mui/icons-material/Timeline';
import { useOrderWork } from '../features/orders/hooks/useOrderDetail.ts';
import { GarmentEssentials } from '../features/orders/components/GarmentEssentials.tsx';
import { MeasurementsGrid } from '../features/orders/components/MeasurementsGrid.tsx';
import { WorkflowGraph } from '../features/workflow/components/WorkflowGraph.tsx';
import { WorkflowStageTimeline } from '../features/workflow/components/WorkflowStageTimeline.tsx';
import { formatDeadline } from '../utils/format.ts';

// The essentials of an order for the tailor making it: their garments, fabric, design notes, measurements and the
// stage timeline. Price, contact details and audit stay on the full order page, which the server refuses to tailors.
export function OrderWorkPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: order, isLoading, isError } = useOrderWork(id!);
  const [chosenGarmentId, setSelectedGarmentId] = useState<string | null>(null);
  const [tab, setTab] = useState<'graph' | 'timeline'>('timeline');

  const garments = order?.garments ?? [];
  // The garment picked here, else the one the link pointed at, else the first
  const targetId = (location.state as { targetGarmentId?: string } | null)?.targetGarmentId;
  const selectedGarmentId =
    [chosenGarmentId, targetId].find((id) => id && garments.some((g) => g.id === id)) ?? garments[0]?.id ?? null;

  if (isLoading) return <div className="sf-loading-overlay sf-glass">Loading order...</div>;
  if (isError || !order) {
    return (
      <div className="container p-lg text-center">
        <h1>Order Not Found</h1>
        <p>This order is not assigned to you, or it does not exist.</p>
      </div>
    );
  }

  const garment = garments.find((g) => g.id === selectedGarmentId);

  return (
    <Box className="container" sx={{ py: 3 }}>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} sx={{ mb: 2, textTransform: 'none' }}>
        Back
      </Button>

      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={800}>Order #{order.orderNumber}</Typography>
        <Typography color="text.secondary">
          For {order.customerFirstName || 'the customer'} · Event {formatDeadline(order.eventDate)}
        </Typography>
      </Box>

      {garments.length > 1 && (
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
          {garments.map((g) => (
            <Chip
              key={g.id}
              label={g.name}
              color={g.id === selectedGarmentId ? 'primary' : 'default'}
              onClick={() => setSelectedGarmentId(g.id)}
            />
          ))}
        </Stack>
      )}

      {garment ? (
        <Stack spacing={3}>
          <Card className="sf-card" sx={{ p: 4, borderRadius: 3 }}>
            <Stack spacing={4}>
              <Box>
                <Typography variant="h5" fontWeight={800}>{garment.name}</Typography>
                <Chip label={garment.status} size="small" sx={{ mt: 1, fontWeight: 700, borderRadius: 1.5, textTransform: 'uppercase' }} />
              </Box>
              <GarmentEssentials garment={garment} />
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={800} sx={{ textTransform: 'uppercase', mb: 2, display: 'block' }}>
                  Precision Measurements
                </Typography>
                <MeasurementsGrid measurements={order.measurements} requiredKeys={garment.requiredMeasurements} />
              </Box>
            </Stack>
          </Card>

          <Card className="sf-card" sx={{ p: 0, borderRadius: 3, overflow: 'hidden' }}>
            <Box sx={{ px: 3, pt: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="h6" fontWeight={800} sx={{ mb: 1.5 }}>Production Workflow</Typography>
              <Tabs
                value={tab}
                onChange={(_, v) => setTab(v)}
                sx={{ minHeight: 36, '& .MuiTab-root': { minHeight: 36, fontSize: '12px', fontWeight: 700, textTransform: 'none' } }}
              >
                <Tab label={<Stack direction="row" spacing={0.5} alignItems="center"><TimelineIcon sx={{ fontSize: 14 }} /><span>Stage Timeline</span></Stack>} value="timeline" />
                <Tab label="DAG View" value="graph" />
              </Tabs>
            </Box>
            <Box sx={{ p: 3 }}>
              {tab === 'graph'
                ? <WorkflowGraph garmentId={garment.id} orderId={order.id} />
                : <WorkflowStageTimeline garmentId={garment.id} />}
            </Box>
          </Card>
        </Stack>
      ) : (
        <Typography color="text.secondary">No garments on this order are assigned to you.</Typography>
      )}
    </Box>
  );
}
