import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomers, useCreateCustomer } from '../features/customers/hooks/useCustomers';
import { ErrorState } from '../components/feedback/ErrorState';
import { useToastStore } from '../components/feedback/Toast';
import { 
  CircularProgress, Typography, Box, List, ListItemAvatar, 
  Avatar, ListItemText, Card, InputAdornment, TextField, IconButton, 
  Stack, Chip, alpha, ListItemButton, Dialog, DialogTitle, DialogContent, DialogActions, Button
} from '@mui/material';
import { 
  Search as SearchIcon, 
  Close as CloseIcon, 
  ChevronRight, 
  Add as AddIcon
} from '@mui/icons-material';
import { usePullToRefresh } from '../hooks/usePullToRefresh.ts';

export function CustomersPage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

  const showToast = useToastStore((state) => state.showToast);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({ name: '', phone: '', email: '' });
  
  const createMutation = useCreateCustomer();

  const handleCreateCustomer = async () => {
    if (!newCustomerForm.name.trim()) {
      showToast("Validation Error", "Client name is required.", "error");
      return;
    }
    
    try {
      const newCustomer = await createMutation.mutateAsync(newCustomerForm);
      showToast(
        "Client Created",
        `${newCustomerForm.name} has been added${newCustomerForm.email ? `. A welcome email with login credentials has been sent to ${newCustomerForm.email}` : ' to the system'}.`,
        "success"
      );
      setIsAddModalOpen(false);
      setNewCustomerForm({ name: '', phone: '', email: '' });
      navigate(`/customers/${newCustomer.id}`);
    } catch (err: any) {
      showToast("Creation Failed", err.response?.data?.message || err.message || "Failed to create customer.", "error");
    }
  };

  // Wait for typing to pause before searching
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data, isLoading, isError, error, refetch } = useCustomers(page, limit, debouncedSearch);

  const { refreshing, pullDelta } = usePullToRefresh({
    onRefresh: async () => {
      await refetch();
    }
  });

  if (isError) {
    return (
      <div className="container mt-xl">
        <ErrorState 
          error={error} 
          onRetry={() => refetch()} 
          title="Failed to load customers"
        />
      </div>
    );
  }

  const totalPages = data ? Math.ceil(data.total / limit) : 0;

  return (
    <div className="customers-page container" style={{ position: 'relative', paddingBottom: '90px' }}>
      {/* Pull to Refresh Indicator */}
      <div 
        style={{ 
          position: 'absolute', 
          top: -40, 
          left: 0, 
          right: 0, 
          display: 'flex', 
          justifyContent: 'center',
          transform: `translateY(${Math.min(pullDelta, 100)}px)`,
          opacity: pullDelta > 20 ? 1 : 0,
          transition: refreshing ? 'transform 0.2s' : 'none',
          zIndex: 10
        }}
      >
        <CircularProgress 
          size={24} 
          thickness={6} 
          value={refreshing ? undefined : Math.min((pullDelta / 80) * 100, 100)}
          variant={refreshing ? "indeterminate" : "determinate"}
          sx={{ color: '#1e5c3a' }}
        />
      </div>

      <header className="mb-lg flex justify-between items-end">
        <div>
          <Typography 
            variant="h3" 
            className="mobile-page-title md:text-h1"
            sx={{ 
              fontSize: { xs: '1.75rem', md: 'clamp(1.5rem, 4vw, 2.5rem)' },
              fontWeight: 800,
              lineHeight: 1.2,
              letterSpacing: '-0.02em'
            }}
          >
            Clients
          </Typography>
        </div>
        <Box sx={{ display: { xs: 'none', md: 'block' } }}>
          <button className="btn btn-primary" onClick={() => setIsAddModalOpen(true)}>
            + New Client
          </button>
        </Box>
      </header>

      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search clients..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: 'text.secondary' }} />
              </InputAdornment>
            ),
            endAdornment: searchTerm ? (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => setSearchTerm('')}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ) : null,
            sx: {
              borderRadius: '20px',
              bgcolor: 'background.paper',
              '& fieldset': { borderColor: 'divider' },
              '&:hover fieldset': { borderColor: 'primary.light' },
              '&.Mui-focused fieldset': { borderColor: 'primary.main', borderWidth: '2px' }
            }
          }}
        />
        <Typography variant="caption" sx={{ display: 'block', mt: 1, ml: 1, color: 'text.disabled' }}>
          {data && !isLoading ? `Found ${data.total} clients` : '\u00A0'}
        </Typography>
      </Box>

      <Card sx={{ borderRadius: '24px', boxShadow: '0 8px 32px rgba(0,0,0,0.04)', border: '1px solid', borderColor: 'divider' }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
            <CircularProgress sx={{ color: 'primary.main' }} />
          </Box>
        ) : data?.items.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8, px: 2 }}>
            <Avatar sx={{ mx: 'auto', mb: 2, bgcolor: alpha('#1e5c3a', 0.1), color: 'primary.main', width: 64, height: 64 }}>
              <SearchIcon sx={{ fontSize: 32 }} />
            </Avatar>
            {debouncedSearch ? (
              <>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>No clients found</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
                  We couldn't find any clients matching "{debouncedSearch}"
                </Typography>
                <button className="btn btn-secondary" onClick={() => setSearchTerm('')}>Clear Search</button>
              </>
            ) : (
              <>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>No clients yet</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
                  Add your first client to start taking orders.
                </Typography>
                <button className="btn btn-primary" onClick={() => setIsAddModalOpen(true)}>+ New Client</button>
              </>
            )}
          </Box>
        ) : (
          <List sx={{ p: 0 }}>
            {data?.items.map((customer, index) => (
              <Box key={customer.id}>
                <ListItemButton 
                  onClick={() => navigate(`/customers/${customer.id}`)}
                  sx={{ 
                    p: { xs: 2, sm: 3 },
                    transition: 'background-color 0.2s',
                    '&:hover': { bgcolor: alpha('#1e5c3a', 0.02) }
                  }}
                >
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: alpha('#1e5c3a', 0.1), color: 'primary.main', fontWeight: 800, width: { xs: 44, sm: 48 }, height: { xs: 44, sm: 48 } }}>
                      {customer.name.charAt(0).toUpperCase()}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    disableTypography
                    primary={
                      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                          {customer.name}
                        </Typography>
                        {customer.totalOrders > 0 && (
                          <Chip 
                            label={`${customer.totalOrders} order${customer.totalOrders !== 1 ? 's' : ''}`}
                            size="small"
                            sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700, bgcolor: alpha('#1e5c3a', 0.1), color: 'primary.main' }}
                          />
                        )}
                      </Stack>
                    }
                    secondary={
                      <Stack spacing={0.25} sx={{ mt: 0.5 }}>
                        {customer.phone && (
                          <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
                            {customer.phone}
                          </Typography>
                        )}
                        {!customer.phone && customer.email && (
                          <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
                            {customer.email}
                          </Typography>
                        )}
                        <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                          ID: {customer.id.split('-')[0].toUpperCase()}
                        </Typography>
                      </Stack>
                    }
                  />
                  <ChevronRight sx={{ color: 'text.disabled' }} />
                </ListItemButton>
                {index < data.items.length - 1 && <Box sx={{ height: '1px', bgcolor: 'divider', ml: { xs: 9, sm: 10 } }} />}
              </Box>
            ))}
          </List>
        )}
      </Card>

      {!isLoading && totalPages > 1 && (
        <Stack direction="row" justifyContent="center" spacing={1} sx={{ mt: 4 }}>
          <button 
            className="btn btn-secondary btn-sm" 
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
            style={{ borderRadius: '12px' }}
          >
            Prev
          </button>
          <Box sx={{ display: 'flex', alignItems: 'center', px: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {page} <span style={{ color: 'var(--sf-text-muted, #9ca3af)', fontWeight: 400 }}>/ {totalPages}</span>
            </Typography>
          </Box>
          <button 
            className="btn btn-secondary btn-sm"
            disabled={page === totalPages}
            onClick={() => setPage(p => p + 1)}
            style={{ borderRadius: '12px' }}
          >
            Next
          </button>
        </Stack>
      )}

      {/* Floating Action Button - Mobile Only */}
      <div className="fab-container desktop-hide">
        <div className="fab-main" onClick={() => setIsAddModalOpen(true)}>
          <AddIcon />
        </div>
      </div>

      {/* NEW CLIENT MODAL */}
      <Dialog 
        open={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: '24px', p: 2 }
        }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Add New Client</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary' }}>
            Enter the client's contact details. You can add measurements to their profile afterwards.
          </Typography>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              label="Full Name"
              required
              fullWidth
              value={newCustomerForm.name}
              onChange={(e) => setNewCustomerForm({ ...newCustomerForm, name: e.target.value })}
            />
            <TextField
              label="Phone Number"
              fullWidth
              type="tel"
              value={newCustomerForm.phone}
              onChange={(e) => setNewCustomerForm({ ...newCustomerForm, phone: e.target.value })}
            />
            <TextField
              label="Email Address"
              fullWidth
              type="email"
              value={newCustomerForm.email}
              onChange={(e) => setNewCustomerForm({ ...newCustomerForm, email: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setIsAddModalOpen(false)} sx={{ color: 'text.secondary' }}>Cancel</Button>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleCreateCustomer}
            disabled={createMutation.isPending || !newCustomerForm.name.trim()}
            sx={{ borderRadius: '12px', px: 4, fontWeight: 700 }}
          >
            {createMutation.isPending ? 'Saving...' : 'Create Profile'}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
