import { useState } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  TextField, 
  Stack,
  alpha,
  MenuItem,
  List,
  ListItem,
  ListItemAvatar,
  Avatar,
  ListItemText,
  Card,
  CircularProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Inventory as InventoryIcon,
  LocalShipping as ShippingIcon,
  PhotoCamera as PhotoCameraIcon,
} from '@mui/icons-material';
import { useInventory, useReceiveShipment, useRegisterMaterial, useUpdateMaterialImage } from '../features/inventory/useInventory';
import { ErrorState } from '../components/feedback/ErrorState';

export function InventoryPage() {
  const { data: inventory, isLoading, isError, error, refetch } = useInventory();
  const receiveMutation = useReceiveShipment();
  const registerMutation = useRegisterMaterial();
  const updateImageMutation = useUpdateMaterialImage();

  const [selectedMaterial, setSelectedMaterial] = useState<{ id: string, name: string } | null>(null);
  const [receiveData, setReceiveData] = useState({ quantity: '', notes: '' });
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [newMaterial, setNewMaterial] = useState({ name: '', sku: '', canonicalUnit: 'Yards' });
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const handleUpdatePhoto = (materialId: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) updateImageMutation.mutate({ materialId, file });
    };
    input.click();
  };

  const handleOpenReceive = (material: { materialId: string, name: string }) => {
    setSelectedMaterial({ id: material.materialId, name: material.name });
    setReceiveData({ quantity: '', notes: 'Shipment received' });
  };

  const handleCloseReceive = () => {
    setSelectedMaterial(null);
    setReceiveData({ quantity: '', notes: '' });
  };

  const handleSubmitReceive = async () => {
    if (!selectedMaterial || !receiveData.quantity) return;
    
    await receiveMutation.mutateAsync({
      materialId: selectedMaterial.id,
      quantity: parseFloat(receiveData.quantity),
      notes: receiveData.notes
    });
    
    handleCloseReceive();
  };
 
  const handleRegisterMaterial = async () => {
    if (!newMaterial.name || !newMaterial.canonicalUnit) return;
    
    const formData = new FormData();
    formData.append('name', newMaterial.name);
    if (newMaterial.sku) formData.append('sku', newMaterial.sku);
    formData.append('canonicalUnit', newMaterial.canonicalUnit);
    if (selectedImage) {
      formData.append('image', selectedImage);
    }

    await registerMutation.mutateAsync(formData);
    setIsRegisterOpen(false);
    setNewMaterial({ name: '', sku: '', canonicalUnit: 'Yards' });
    setSelectedImage(null);
    setImagePreview(null);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    }
  };

  if (isError) {
    return (
      <Box className="container mt-xl">
        <ErrorState 
          error={error} 
          onRetry={() => refetch()} 
          title="The Vault Door is Jammed"
        />
      </Box>
    );
  }

  return (
    <Box className="container" sx={{ paddingBottom: '90px' }}>
      <header className="mb-lg flex justify-between items-end">
        <Box>
          <Typography 
            variant="h3" 
            className="mobile-page-title md:text-h1"
            sx={{ 
              fontSize: { xs: '1.75rem', md: 'clamp(1.5rem, 4vw, 2.5rem)' },
              fontWeight: 800,
              lineHeight: 1.2,
              letterSpacing: '-0.02em',
              mb: 1
            }}
          >
            Material Vault
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Physical stock ledger and real-time inventory.
          </Typography>
        </Box>
        <Box sx={{ display: { xs: 'none', md: 'block' } }}>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />}
            onClick={() => setIsRegisterOpen(true)}
            sx={{ 
              borderRadius: '12px', 
              fontWeight: 700, 
              bgcolor: '#1e5c3a',
              px: 3,
              py: 1.5,
              '&:hover': { bgcolor: '#277a4d' }
            }}
          >
            Register Material
          </Button>
        </Box>
      </header>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
          <CircularProgress sx={{ color: 'primary.main' }} />
        </Box>
      ) : inventory?.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8, px: 2 }}>
          <Avatar sx={{ mx: 'auto', mb: 2, bgcolor: alpha('#1e5c3a', 0.1), color: 'primary.main', width: 64, height: 64 }}>
            <InventoryIcon sx={{ fontSize: 32 }} />
          </Avatar>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Empty Vault</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
            There are no materials registered in the inventory yet.
          </Typography>
        </Box>
      ) : (
        <Card sx={{ borderRadius: '24px', boxShadow: '0 8px 32px rgba(0,0,0,0.04)', border: '1px solid', borderColor: 'divider' }}>
          <List sx={{ p: 0 }}>
            {inventory?.map((item, index) => (
              <Box key={`${item.materialId}-${index}`}>
                <ListItem 
                  sx={{ 
                    p: { xs: 2.5, sm: 3 },
                    display: 'flex',
                    flexDirection: { xs: 'column', md: 'row' },
                    alignItems: { xs: 'stretch', md: 'center' },
                    gap: { xs: 2.5, md: 3 }
                  }}
                >
                  {/* Avatar & Identifiers */}
                  <Box sx={{ display: 'flex', alignItems: 'center', flex: 1, gap: 2 }}>
                    <ListItemAvatar>
                      { item.imageUrl ? (
                        <Avatar
                          src={item.imageUrl}
                          variant="rounded"
                          sx={{ width: 64, height: 64, borderRadius: '16px', border: '1px solid', borderColor: 'divider' }}
                        />
                      ) : (
                        <Avatar variant="rounded" sx={{ width: 64, height: 64, borderRadius: '16px', bgcolor: alpha('#1e5c3a', 0.05), color: 'primary.main' }}>
                          <InventoryIcon />
                        </Avatar>
                      )}
                    </ListItemAvatar>
                    <ListItemText
                      disableTypography
                      primary={
                        <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.2, mb: 0.5 }}>
                          {item.name}
                        </Typography>
                      }
                      secondary={
                        <Stack spacing={0.5}>
                          <Typography variant="body2" sx={{ color: 'text.secondary', fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: 600 }}>
                            {item.sku || 'NO-SKU'}
                          </Typography>
                        </Stack>
                      }
                    />
                  </Box>

                  {/* Stock Metrics */}
                  <Box sx={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(3, 1fr)', 
                    gap: 2, 
                    bgcolor: { xs: alpha('#000', 0.02), md: 'transparent' }, 
                    p: { xs: 1.5, md: 0 }, 
                    borderRadius: '12px' 
                  }}>
                    <Box sx={{ textAlign: { xs: 'center', md: 'left' } }}>
                      <Typography variant="overline" sx={{ color: 'text.disabled', fontWeight: 800, lineHeight: 1 }}>TOTAL</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 800 }}>{item.totalLedger}</Typography>
                    </Box>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="overline" sx={{ color: 'text.disabled', fontWeight: 800, lineHeight: 1 }}>RESERVED</Typography>
                      <Typography variant="body1" sx={{ color: item.activeReservations > 0 ? 'secondary.main' : 'text.disabled', fontWeight: 700 }}>
                        {item.activeReservations}
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: { xs: 'center', md: 'right' } }}>
                      <Typography variant="overline" sx={{ color: 'text.disabled', fontWeight: 800, lineHeight: 1 }}>AVAILABLE</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 900, color: item.quantityAvailable > 0 ? 'primary.main' : 'error.main' }}>
                        {item.quantityAvailable} {item.unit}
                      </Typography>
                    </Box>
                  </Box>

                  <Stack spacing={1} sx={{ mt: { xs: 1, md: 0 }, minWidth: { md: 180 } }}>
                    <Button
                      variant="outlined"
                      fullWidth
                      startIcon={<ShippingIcon />}
                      onClick={() => handleOpenReceive(item)}
                      sx={{ borderRadius: '12px', fontWeight: 800, py: 1.2, borderColor: alpha('#1e5c3a', 0.2), color: '#1e5c3a' }}
                    >
                      Receive Stock
                    </Button>
                    <Button
                      variant="text"
                      fullWidth
                      size="small"
                      startIcon={<PhotoCameraIcon sx={{ fontSize: 14 }} />}
                      onClick={() => handleUpdatePhoto(item.materialId)}
                      disabled={updateImageMutation.isPending}
                      sx={{ borderRadius: '12px', fontWeight: 700, fontSize: '11px', color: 'text.secondary', '&:hover': { color: '#1e5c3a' } }}
                    >
                      {updateImageMutation.isPending ? 'Uploading...' : 'Update Photo'}
                    </Button>
                  </Stack>
                </ListItem>
                {index < inventory.length - 1 && <Box sx={{ height: '1px', bgcolor: 'divider', ml: { xs: 2.5, sm: 3 }, mr: { xs: 2.5, sm: 3 } }} />}
              </Box>
            ))}
          </List>
        </Card>
      )}

      {/* Floating Action Button - Mobile Only */}
      <div className="fab-container desktop-hide">
        <div className="fab-main" onClick={() => setIsRegisterOpen(true)}>
          <AddIcon />
        </div>
      </div>

      {/* RECEIVE SHIPMENT MODAL */}
      <Dialog 
        open={Boolean(selectedMaterial)} 
        onClose={handleCloseReceive}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: '24px', p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Receive Shipment</DialogTitle>
        <DialogContent>
          <Box sx={{ py: 1 }}>
            <Typography variant="subtitle2" sx={{ mb: 2 }}>
              Logging incoming stock for: <strong style={{ color: 'var(--sf-green)' }}>{selectedMaterial?.name}</strong>
            </Typography>
            
            <Stack spacing={3}>
              <TextField
                label="Quantity (Yards/Units)"
                fullWidth
                value={receiveData.quantity}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9.]/g, '');
                  if ((val.match(/\./g) || []).length <= 1) {
                    setReceiveData({ ...receiveData, quantity: val });
                  }
                }}
                inputProps={{
                  inputMode: 'decimal',
                  pattern: '[0-9]*\\.?[0-9]*',
                }}
                autoFocus
                placeholder="0.00"
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
              />
              <TextField
                label="Notes"
                fullWidth
                multiline
                rows={2}
                value={receiveData.notes}
                onChange={(e) => setReceiveData({ ...receiveData, notes: e.target.value })}
                placeholder="e.g. Italian Wool Shipment #104"
              />
            </Stack>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={handleCloseReceive} sx={{ color: 'text.secondary' }}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleSubmitReceive}
            disabled={!receiveData.quantity || receiveMutation.isPending}
            startIcon={<AddIcon />}
            sx={{ borderRadius: '12px', fontWeight: 700, px: 3 }}
          >
            {receiveMutation.isPending ? 'Logging...' : 'Confirm Shipment'}
          </Button>
        </DialogActions>
      </Dialog>
 
      {/* REGISTER MATERIAL MODAL */}
      <Dialog 
        open={isRegisterOpen} 
        onClose={() => setIsRegisterOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: '24px', p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Register New Material</DialogTitle>
        <DialogContent>
          <Box sx={{ py: 1 }}>
            <Stack spacing={2.5}>
              <Box sx={{ mb: 1 }}>
                <Typography variant="overline" sx={{ fontWeight: 800, color: 'text.secondary', display: 'block', mb: 1 }}>
                  Visual Verification <span style={{ color: '#ef4444' }}>*</span>
                </Typography>
                <Stack spacing={2} alignItems="center">
                  {imagePreview ? (
                    <Box 
                      component="img" 
                      src={imagePreview} 
                      sx={{ width: '100%', height: 160, borderRadius: '16px', objectFit: 'cover', border: '1px solid var(--sf-border, rgba(0,0,0,0.12))' }}
                    />
                  ) : (
                    <Box sx={{ 
                      width: '100%', 
                      height: 120, 
                      borderRadius: '16px', 
                      border: '2px dashed',
                      borderColor: 'divider',
                      display: 'flex', 
                      flexDirection: 'column',
                      alignItems: 'center', 
                      justifyContent: 'center',
                      bgcolor: alpha('#000', 0.02)
                    }}>
                      <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 600 }}>No Fabric Photo Captured</Typography>
                    </Box>
                  )}
                  <Button
                    component="label"
                    variant="outlined"
                    fullWidth
                    startIcon={<AddIcon />}
                    sx={{ borderRadius: '12px', textTransform: 'none', fontWeight: 700 }}
                  >
                    {imagePreview ? 'Retake Photo' : 'Capture Fabric Photo'}
                    <input
                      type="file"
                      hidden
                      accept="image/*"
                      capture="environment"
                      onChange={handleImageChange}
                    />
                  </Button>
                </Stack>
              </Box>

              <Typography variant="overline" sx={{ fontWeight: 800, color: 'text.secondary', display: 'block' }}>
                Material Metadata
              </Typography>
              
              <TextField
                label="Material Name"
                fullWidth
                size="small"
                value={newMaterial.name}
                onChange={(e) => setNewMaterial({ ...newMaterial, name: e.target.value })}
                placeholder="e.g. Italian Merino Wool"
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
              />
              <TextField
                label="SKU / Reference"
                fullWidth
                size="small"
                value={newMaterial.sku}
                onChange={(e) => setNewMaterial({ ...newMaterial, sku: e.target.value })}
                placeholder="e.g. WOO-MER-IT-001"
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
              />
              <TextField
                select
                label="Canonical Unit"
                fullWidth
                size="small"
                value={newMaterial.canonicalUnit}
                onChange={(e) => setNewMaterial({ ...newMaterial, canonicalUnit: e.target.value })}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
              >
                <MenuItem value="Yards">Yards</MenuItem>
                <MenuItem value="Meters">Meters</MenuItem>
                <MenuItem value="Pieces">Pieces</MenuItem>
                <MenuItem value="Boxes">Boxes</MenuItem>
              </TextField>
            </Stack>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setIsRegisterOpen(false)} sx={{ color: 'text.secondary' }}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleRegisterMaterial}
            disabled={!newMaterial.name || !selectedImage || registerMutation.isPending}
            sx={{ 
              borderRadius: '12px', 
              fontWeight: 700, 
              px: 3, 
              bgcolor: '#1e5c3a',
              '&.Mui-disabled': { bgcolor: alpha('#1e5c3a', 0.1) }
            }}
          >
            {registerMutation.isPending ? 'Registering...' : 'Register Material'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
