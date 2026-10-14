import { useState, useEffect } from 'react';
import { 
  Dialog, DialogTitle, DialogContent, DialogActions, 
  Button, Stack, Typography, FormControl, Select, MenuItem, TextField, Box
} from '@mui/material';
import { useUpdateOrder } from '../hooks/useUpdateOrder.ts';
import { useCustomerProfile } from '../../customers/hooks/useCustomerProfile.ts';

interface EditOrderModalProps {
  open: boolean;
  onClose: () => void;
  order: any;
}

export function EditOrderModal({ open, onClose, order }: EditOrderModalProps) {
  const { data: profileData } = useCustomerProfile(order?.customerId);
  const { mutate: updateOrder, isPending } = useUpdateOrder(order?.id);

  const [dateStr, setDateStr] = useState('');
  const [versionId, setVersionId] = useState('');

  useEffect(() => {
    if (open && order) {
      if (order.eventDate) {
        const d = new Date(order.eventDate);
        const iso = d.toISOString().split('T')[0];
        setDateStr(iso);
      }
      setVersionId(order.lockedMeasurementVersionId || '');
    }
  }, [open, order]);

  const handleSubmit = () => {
    if (!order) return;
    
    // Send the date as an ISO string
    const dateObj = new Date(dateStr);
    const isoString = dateObj.toISOString();
    
    updateOrder({
      eventDate: isoString,
      lockedMeasurementVersionId: versionId || undefined
    }, {
      onSuccess: () => {
        onClose();
      }
    });
  };

  const versions = profileData?.measurementVersions || [];

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="sm" 
      fullWidth 
      PaperProps={{ className: "sf-glass sf-card", sx: { borderRadius: 3 } }}
    >
      <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>Administrative Override: Edit Order</DialogTitle>
      <DialogContent sx={{ pb: 1 }}>
        <Stack spacing={3} sx={{ mt: 2 }}>
          <Box>
             <Typography variant="caption" color="text.secondary" fontWeight={700} textTransform="uppercase">
               Event Date
             </Typography>
             <TextField 
               type="date"
               fullWidth
               value={dateStr}
               onChange={(e) => setDateStr(e.target.value)}
               InputLabelProps={{ shrink: true }}
               sx={{ mt: 1 }}
             />
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={700} textTransform="uppercase" sx={{ display: 'block', mb: 1 }}>
              Locked Measurement Version
            </Typography>
            <FormControl fullWidth>
              <Select
                value={versionId}
                onChange={(e) => setVersionId(e.target.value)}
                displayEmpty
              >
                <MenuItem value="">
                  <em>No Version Locked</em>
                </MenuItem>
                {versions.map((v: any) => (
                  <MenuItem key={v.id} value={v.id}>
                    Version {v.versionNumber || v.version_number} - {new Date(v.createdAt || v.created_at).toLocaleDateString()}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
         <Button onClick={onClose} color="inherit" disabled={isPending}>Cancel</Button>
         <Button onClick={handleSubmit} variant="contained" disabled={isPending || !dateStr}>
           {isPending ? 'Updating...' : 'Save Changes'}
         </Button>
      </DialogActions>
    </Dialog>
  );
}
