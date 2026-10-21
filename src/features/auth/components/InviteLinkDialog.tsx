import { useState } from 'react'
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { ContentCopy as CopyIcon, WhatsApp as WhatsAppIcon } from '@mui/icons-material'
import { BRAND_NAME } from '../../../config/brand'

interface Props {
  open: boolean
  inviteUrl: string
  name: string
  email: string
  onClose: () => void
}

// The invite was emailed; this also shows the link so it can be sent another way if the email doesn't arrive
export function InviteLinkDialog({ open, inviteUrl, name, email, onClose }: Props) {
  const [copied, setCopied] = useState(false)
  const whatsappText = encodeURIComponent(`Hi ${name}, here is your link to join us on ${BRAND_NAME}: ${inviteUrl}`)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
    } catch {
      // Clipboard can be blocked; the link is selectable in the box
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '20px', p: 1 } }}>
      <DialogTitle sx={{ fontWeight: 800 }}>Invite sent</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
          We emailed <strong>{email}</strong> a link to set their password. If it doesn't arrive, send them this link
          yourself. It works once and expires in 7 days.
        </Typography>
        <TextField
          fullWidth
          size="small"
          value={inviteUrl}
          InputProps={{ readOnly: true, sx: { fontFamily: 'monospace', fontSize: '0.8rem' } }}
          onFocus={(e) => e.target.select()}
          inputProps={{ 'aria-label': 'Invite link' }}
        />
        {copied && <Alert severity="success" sx={{ mt: 1.5, borderRadius: '10px' }}>Link copied.</Alert>}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ width: '100%' }} justifyContent="flex-end">
          <Button
            startIcon={<WhatsAppIcon />}
            href={`https://wa.me/?text=${whatsappText}`}
            target="_blank"
            rel="noopener noreferrer"
            sx={{ fontWeight: 700 }}
          >
            Share on WhatsApp
          </Button>
          <Button startIcon={<CopyIcon />} variant="outlined" onClick={copy} sx={{ fontWeight: 700, borderRadius: '10px' }}>
            Copy link
          </Button>
          <Button variant="contained" onClick={onClose} sx={{ fontWeight: 700, borderRadius: '10px' }}>
            Done
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  )
}
