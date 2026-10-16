import { useQuery } from '@tanstack/react-query';
import { Box, Button, Stack, Typography, alpha } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ShareOutlinedIcon from '@mui/icons-material/ShareOutlined';
import { ordersApi } from '../orders.api';
import { useToastStore } from '../../../components/feedback/Toast';

interface CustomerLinkPanelProps {
  orderId: string;
}

const buttonSx = {
  borderRadius: 2, fontWeight: 700, fontSize: '11px', textTransform: 'none', whiteSpace: 'nowrap',
  borderColor: alpha('#1e5c3a', 0.4), color: '#1e5c3a',
  '&:hover': { borderColor: '#1e5c3a', bgcolor: alpha('#1e5c3a', 0.04) },
} as const;

// navigator.clipboard only exists on https/localhost and can be refused, so fall back to the old copy command
async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    return;
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(area);
    if (!ok) throw new Error('copy failed');
  }
}

// The customer's private order page, for staff to send by hand while WhatsApp/SMS is off.
// The customer confirms their fabric and design brief there.
export function CustomerLinkPanel({ orderId }: CustomerLinkPanelProps) {
  const showToast = useToastStore((s) => s.showToast);
  const { data: link, isLoading, isError } = useQuery({
    queryKey: ['customer-link', orderId],
    queryFn: () => ordersApi.getCustomerLink(orderId),
    // The portal page is created just after the order, so check again shortly if it is not there yet
    refetchInterval: (query) => (query.state.data && !query.state.data.portalUrl ? 3000 : false),
  });

  const portalUrl = link?.portalUrl ?? null;

  const handleCopy = async (url: string) => {
    try {
      await copyText(url);
      showToast('Link copied', 'Paste it into WhatsApp, SMS or email for the customer.');
    } catch {
      showToast('Could not copy', 'Select the link and copy it by hand.', 'error');
    }
  };

  const handleShare = (url: string) => {
    const text = `Here is your private order page. Please review and confirm your order details: ${url}`;
    if (navigator.share) {
      navigator.share({ text }).catch(() => {/* user cancelled */});
    } else {
      window.open(`sms:?body=${encodeURIComponent(text)}`);
    }
  };

  return (
    <Box sx={{ pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
      <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: 1, display: 'block', mb: 1 }}>
        Customer Link
      </Typography>

      {isLoading ? (
        <Typography variant="caption" color="text.secondary">Loading link…</Typography>
      ) : isError ? (
        <Typography variant="caption" color="error">Could not load the customer link.</Typography>
      ) : !portalUrl ? (
        <Typography variant="caption" color="text.secondary">The customer's page is being prepared. The link will appear here shortly.</Typography>
      ) : (
        <Stack spacing={1}>
          <Typography variant="caption" color="text.secondary">
            Send this private link to the customer so they can confirm their fabric and design. Anyone with it can see the order, so share it only with them.
          </Typography>
          <Typography
            data-testid="customer-portal-url"
            variant="body2"
            sx={{ fontFamily: 'monospace', fontSize: '12px', wordBreak: 'break-all', userSelect: 'all', bgcolor: alpha('#1e5c3a', 0.04), px: 1, py: 0.75, borderRadius: 1 }}
          >
            {portalUrl}
          </Typography>
          <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
            <Button size="small" variant="outlined" startIcon={<ContentCopyIcon />} onClick={() => handleCopy(portalUrl)} sx={buttonSx}>
              Copy link
            </Button>
            <Button size="small" variant="outlined" startIcon={<ShareOutlinedIcon />} onClick={() => handleShare(portalUrl)} sx={buttonSx}>
              Share
            </Button>
            {link?.trackingUrl && (
              <Button size="small" onClick={() => handleCopy(link.trackingUrl!)} sx={{ ...buttonSx, borderColor: 'transparent' }}>
                Copy tracking link
              </Button>
            )}
          </Stack>
        </Stack>
      )}
    </Box>
  );
}
