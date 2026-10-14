import { useState } from "react"
import {
  useStaffList,
  useInviteStaff,
  useUpdateStaffStatus,
  useRemoveStaff,
  useChangeStaffRole,
  useStaffAccessLog,
  useStores,
} from "../features/auth/hooks/useStaff"
import { ASSIGNABLE_STAFF_ROLES, type Staff, type StaffRole } from "../features/auth/staff.api"
import { useAuthStore } from "../features/auth/auth.store"
import { 
  Box, Typography, Button, Dialog, DialogTitle, DialogContent, 
  DialogActions, TextField, Stack, alpha, MenuItem, List, 
  ListItem, ListItemAvatar, Avatar, ListItemText, Card, Chip,
  CircularProgress
} from '@mui/material';
import { 
  Add as AddIcon,
  Store as StoreIcon,
  Email as EmailIcon,
  AdminPanelSettings as AdminIcon,
  Person as PersonIcon,
  Block as BlockIcon,
  CheckCircle as CheckCircleIcon,
  Security as SecurityIcon
} from '@mui/icons-material';

export function StaffManagementPage() {
  const currentUser = useAuthStore((state) => state.user)

  const { data: staff, isLoading: isLoadingStaff } = useStaffList()
  const { data: stores, isLoading: isLoadingStores } = useStores()
  const inviteStaff = useInviteStaff()
  const updateStatus = useUpdateStaffStatus()
  const removeStaff = useRemoveStaff()
  const changeRole = useChangeStaffRole()
  const isOwner = currentUser?.role === "OWNER"
  const { data: accessLog } = useStaffAccessLog(isOwner)
  // Removing staff takes two steps: the button only opens a confirmation
  const [removing, setRemoving] = useState<Staff | null>(null)

  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [inviteData, setInviteData] = useState({
    email: "",
    fullName: "",
    role: "TAILOR",
    storeId: "",
  })

  const getRoleIcon = (role: string) => {
    switch(role) {
      case 'OWNER': return <AdminIcon />;
      case 'MANAGER': return <SecurityIcon />;
      default: return <PersonIcon />;
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteData.storeId && stores && stores.length > 0) {
      await inviteStaff.mutateAsync({ ...inviteData, storeId: stores[0].id })
    } else {
      await inviteStaff.mutateAsync(inviteData)
    }
    setInviteData({
      email: "",
      fullName: "",
      role: "TAILOR",
      storeId: "",
    })
    setIsInviteOpen(false)
  }

  if (!currentUser) return null

  if (isLoadingStaff || isLoadingStores) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
        <CircularProgress sx={{ color: 'primary.main' }} />
      </Box>
    )
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
            Identity & Access
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Manage your production team and store assignments.
          </Typography>
        </Box>
        <Box sx={{ display: { xs: 'none', md: 'block' } }}>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />}
            onClick={() => setIsInviteOpen(true)}
            sx={{ 
              borderRadius: '12px', 
              fontWeight: 700, 
              bgcolor: '#1e5c3a',
              px: 3,
              py: 1.5,
              '&:hover': { bgcolor: '#277a4d' }
            }}
          >
            Invite Staff
          </Button>
        </Box>
      </header>

      <Card sx={{ borderRadius: '24px', boxShadow: '0 8px 32px rgba(0,0,0,0.04)', border: '1px solid', borderColor: 'divider' }}>
        <List sx={{ p: 0 }}>
          {staff?.map((member, index) => (
            <Box key={`${member.id}-${index}`}>
              <ListItem 
                sx={{ 
                  p: { xs: 2.5, sm: 3 },
                  display: 'flex',
                  flexDirection: { xs: 'column', md: 'row' },
                  alignItems: { xs: 'flex-start', md: 'center' },
                  gap: { xs: 2, md: 3 },
                  bgcolor: !member.isActive ? alpha('#d32f2f', 0.02) : 'transparent',
                }}
              >
                {/* Avatar & Identifiers */}
                <Box sx={{ display: 'flex', alignItems: 'center', flex: 1, gap: 2, width: '100%' }}>
                  <ListItemAvatar>
                    <Avatar 
                      sx={{ 
                        width: 56, 
                        height: 56, 
                        borderRadius: '16px', 
                        bgcolor: member.isActive ? alpha('#1e5c3a', 0.1) : alpha('#d32f2f', 0.1), 
                        color: member.isActive ? 'primary.main' : 'error.main' 
                      }}
                    >
                      {getRoleIcon(member.role || 'TAILOR')}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    disableTypography
                    primary={
                      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.2, color: !member.isActive ? 'text.secondary' : 'text.primary' }}>
                          {member.fullName || "—"}
                        </Typography>
                        <Chip
                          icon={member.status === "ACTIVE"
                            ? <CheckCircleIcon sx={{ fontSize: '14px !important' }} />
                            : <BlockIcon sx={{ fontSize: '14px !important' }} />}
                          label={member.status}
                          size="small"
                          sx={{
                            height: 20, fontSize: '0.65rem', fontWeight: 800,
                            bgcolor: member.status === "ACTIVE" ? alpha('#1e5c3a', 0.1) : alpha('#d32f2f', 0.1),
                            color: member.status === "ACTIVE" ? 'primary.main' : 'error.main',
                          }}
                        />
                      </Stack>
                    }
                    secondary={
                      <Stack spacing={0.5}>
                        <Stack direction="row" alignItems="center" spacing={0.5}>
                          <EmailIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                          <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                            {member.email}
                          </Typography>
                        </Stack>
                        <Stack direction="row" alignItems="center" spacing={0.5}>
                          <StoreIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                            {stores?.find((s) => s.id === member.storeId)?.name || "Global / HQ"}
                          </Typography>
                        </Stack>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          Last login: {member.lastLoginAt ? new Date(member.lastLoginAt).toLocaleString() : "never"}
                        </Typography>
                      </Stack>
                    }
                  />
                </Box>

                {/* Role and Actions */}
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: { xs: 'row', md: 'row' },
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: { xs: '100%', md: 'auto' },
                  gap: 2
                }}>
                  {isOwner && member.status !== "REMOVED" && member.role !== "OWNER" && member.id !== currentUser.id ? (
                    <TextField
                      select
                      size="small"
                      value={member.role}
                      onChange={(e) => changeRole.mutate({ id: member.id, role: e.target.value as StaffRole })}
                      disabled={changeRole.isPending}
                      sx={{ minWidth: 140, '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
                    >
                      {ASSIGNABLE_STAFF_ROLES.map((r) => (
                        <MenuItem key={r} value={r}>{r.replace("_", " ")}</MenuItem>
                      ))}
                    </TextField>
                  ) : (
                    <Chip
                      label={member.role?.replace("_", " ")}
                      variant="outlined"
                      sx={{ fontWeight: 700, borderRadius: '8px', color: 'text.secondary', borderColor: 'divider' }}
                    />
                  )}
                  {member.status !== "REMOVED" && member.role !== "OWNER" && member.id !== currentUser.id && (
                    <Button
                      variant={member.isActive ? "outlined" : "contained"}
                      color={member.isActive ? "error" : "primary"}
                      onClick={() => updateStatus.mutate({ id: member.id, isActive: !member.isActive })}
                      disabled={updateStatus.isPending}
                      sx={{ borderRadius: '12px', fontWeight: 800, minWidth: '100px', height: '36px' }}
                    >
                      {member.isActive ? "Suspend" : "Reinstate"}
                    </Button>
                  )}
                  {isOwner && member.status !== "REMOVED" && member.role !== "OWNER" && member.id !== currentUser.id && (
                    <Button
                      color="error"
                      onClick={() => setRemoving(member)}
                      sx={{ borderRadius: '12px', fontWeight: 700, height: '36px' }}
                    >
                      Remove
                    </Button>
                  )}
                </Box>
              </ListItem>
              {index < staff.length - 1 && <Box sx={{ height: '1px', bgcolor: 'divider', ml: { xs: 2.5, sm: 3 }, mr: { xs: 2.5, sm: 3 } }} />}
            </Box>
          ))}
        </List>
        {staff?.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 8, px: 2 }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              No staff members found.
            </Typography>
          </Box>
        )}
      </Card>

      {/* Floating Action Button - Mobile Only */}
      <div className="fab-container desktop-hide">
        <div className="fab-main" onClick={() => setIsInviteOpen(true)}>
          <AddIcon />
        </div>
      </div>

      {/* INVITE STAFF MODAL */}
      <Dialog 
        open={isInviteOpen} 
        onClose={() => setIsInviteOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: '24px', p: 1 } }}
      >
        <form onSubmit={handleInvite}>
          <DialogTitle sx={{ fontWeight: 800 }}>Issue Credentials</DialogTitle>
          <DialogContent>
            <Box sx={{ py: 1 }}>
              <Stack spacing={2.5}>
                <TextField
                  label="Full Name"
                  required
                  fullWidth
                  size="small"
                  value={inviteData.fullName}
                  onChange={(e) => setInviteData({ ...inviteData, fullName: e.target.value })}
                  placeholder="e.g. Jane Tailor"
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                />
                
                <TextField
                  label="Email Address"
                  type="email"
                  required
                  fullWidth
                  size="small"
                  value={inviteData.email}
                  onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                  placeholder="jane@Stitchfyn.io"
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                />

                <TextField
                  select
                  label="System Role"
                  fullWidth
                  size="small"
                  value={inviteData.role}
                  onChange={(e) => setInviteData({ ...inviteData, role: e.target.value })}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                >
                  <MenuItem value="MANAGER">Manager</MenuItem>
                  <MenuItem value="TAILOR">Tailor</MenuItem>
                  <MenuItem value="FRONT_DESK">Front Desk Member</MenuItem>
                </TextField>

                <TextField
                  select
                  label="Store Assignment"
                  fullWidth
                  required
                  size="small"
                  value={inviteData.storeId}
                  onChange={(e) => setInviteData({ ...inviteData, storeId: e.target.value })}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                >
                  <MenuItem value="" disabled>Select a store...</MenuItem>
                  {stores?.map((store) => (
                    <MenuItem key={store.id} value={store.id}>
                      {store.name}
                    </MenuItem>
                  ))}
                </TextField>

              </Stack>
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button onClick={() => setIsInviteOpen(false)} sx={{ color: 'text.secondary' }}>Cancel</Button>
            <Button 
              type="submit"
              variant="contained" 
              disabled={inviteStaff.isPending}
              startIcon={<SecurityIcon />}
              sx={{ borderRadius: '12px', fontWeight: 700, px: 3, bgcolor: '#1e5c3a' }}
            >
              {inviteStaff.isPending ? 'Issuing...' : 'Grant Access'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
      {/* Removal confirmation */}
      <Dialog open={!!removing} onClose={() => setRemoving(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Remove {removing?.fullName}?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            They will lose access immediately and permanently. Everything they recorded stays in your
            history, marked as former staff. You can re-invite them later.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setRemoving(null)} sx={{ color: 'text.secondary' }}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            disabled={removeStaff.isPending}
            onClick={() => removing && removeStaff.mutate(removing.id, { onSuccess: () => setRemoving(null) })}
            sx={{ borderRadius: '12px', fontWeight: 700 }}
          >
            Remove access
          </Button>
        </DialogActions>
      </Dialog>

      {/* Staff access history, owners only; entries can't be changed */}
      {isOwner && (
        <Card sx={{ mt: 3, borderRadius: '24px', border: '1px solid', borderColor: 'divider', p: 3 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1.5 }}>Access log</Typography>
          {(accessLog ?? []).length === 0 ? (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>No access changes yet.</Typography>
          ) : (
            <Stack spacing={1}>
              {accessLog!.map((entry) => (
                <Typography key={entry.id} variant="body2">
                  <strong>{entry.actorName ?? "System"}</strong> {describeAccessChange(entry)}{" "}
                  <Typography component="span" variant="caption" sx={{ color: 'text.secondary' }}>
                    · {new Date(entry.witnessedAt).toLocaleString()}
                  </Typography>
                </Typography>
              ))}
            </Stack>
          )}
        </Card>
      )}
    </Box>
  )
}

function describeAccessChange(entry: { action: string; metadata: Record<string, unknown> }): string {
  const name = String(entry.metadata.staffName ?? "a staff member")
  switch (entry.action) {
    case "STAFF_SUSPENDED": return `suspended ${name}`
    case "STAFF_REINSTATED": return `reinstated ${name}`
    case "STAFF_REMOVED": return `removed ${name}`
    case "STAFF_ROLE_CHANGED": return `changed ${name}'s role from ${entry.metadata.fromRole} to ${entry.metadata.toRole}`
    default: return entry.action
  }
}
