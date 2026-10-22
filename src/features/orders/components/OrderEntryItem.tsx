import React from 'react';
import { Box, Typography, Stack, Chip, Button } from '@mui/material';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import ContentCutOutlinedIcon from '@mui/icons-material/ContentCutOutlined';
import DesignServicesOutlinedIcon from '@mui/icons-material/DesignServicesOutlined';
import { truncateId, safeFormatDistanceToNow } from '../../../utils/format.ts';
import { DeadlineBadge } from './DeadlineBadge.tsx';
import type { ActivationFlag } from '../orders.api.ts';
import { useAuthStore } from '../../auth/auth.store.ts';
import { useRequestActivationReminder } from '../hooks/useRequestActivationReminder.ts';

// The roles allowed to update production on the server
const REMINDER_ROLES = ['OWNER', 'MANAGER', 'TAILOR'];

interface OrderEntryItemProps {
  order: {
    id: string;
    orderNumber?: number | string;
    customerName: string;
    garmentName: string;
    status: string;
    riskLevel?: string;
    eventDate: string;
    createdAt?: string;
    unverifiedFlags?: ActivationFlag[];
    groupOrderId?: string | null;
    groupName?: string | null;
  };
  onClick?: () => void;
  // Opens the order's group; without it the group shows as a plain label
  onGroupClick?: (groupId: string) => void;
}

interface FlagConfig {
  flag: ActivationFlag;
  icon: React.ReactElement;
  pendingLabel: string;
  clearedLabel: string;
}

const FLAG_CONFIGS: FlagConfig[] = [
  {
    flag: 'payment',
    icon: <PaymentsOutlinedIcon sx={{ fontSize: 12 }} />,
    pendingLabel: 'Deposit required',
    clearedLabel: 'Deposit paid',
  },
  {
    flag: 'fabric',
    icon: <ContentCutOutlinedIcon sx={{ fontSize: 12 }} />,
    pendingLabel: 'Fabric unconfirmed',
    clearedLabel: 'Fabric confirmed',
  },
  {
    flag: 'design',
    icon: <DesignServicesOutlinedIcon sx={{ fontSize: 12 }} />,
    pendingLabel: 'Design pending',
    clearedLabel: 'Design agreed',
  },
];

const ActivationChips: React.FC<{ flags?: ActivationFlag[] }> = ({ flags }) => {
  const pendingSet = new Set(flags ?? []);

  return (
    <Stack direction="row" spacing={0.5} sx={{ mt: 1, flexWrap: 'wrap', gap: 0.5 }}>
      {FLAG_CONFIGS.map(({ flag, icon, pendingLabel, clearedLabel }) => {
        const isPending = pendingSet.has(flag);
        return (
          <Chip
            key={flag}
            icon={icon}
            label={isPending ? pendingLabel : clearedLabel}
            size="small"
            sx={{
              height: 20,
              fontSize: '9px',
              fontWeight: 800,
              borderRadius: '4px',
              bgcolor: isPending ? 'rgba(196, 154, 26, 0.1)' : 'rgba(39, 174, 96, 0.08)',
              color: isPending ? '#8a6d1a' : '#1a7a42',
              border: '1px solid',
              borderColor: isPending ? 'rgba(196, 154, 26, 0.25)' : 'rgba(39, 174, 96, 0.2)',
              '& .MuiChip-icon': {
                color: isPending ? '#8a6d1a' : '#1a7a42',
                marginLeft: '4px',
              },
              '& .MuiChip-label': {
                px: 0.75,
              },
            }}
          />
        );
      })}
    </Stack>
  );
};

export const OrderEntryItem: React.FC<OrderEntryItemProps> = ({ order, onClick, onGroupClick }) => {
  const role = useAuthStore((state) => state.user?.role);
  const { mutate: sendReminder, isPending: isReminding } = useRequestActivationReminder();
  const customerStepPending = !!order.unverifiedFlags?.some((f) => f === 'fabric' || f === 'design');
  const canRemind = customerStepPending && !!role && REMINDER_ROLES.includes(role);

  return (
    <Box onClick={onClick} className="order-entry-card">
      <div className="card-top">
        <Stack spacing={0.5}>
          <Typography variant="caption" className="mobile-hide" sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: 1 }}>
            ORDER ID
          </Typography>
          <Typography variant="body1" sx={{ fontWeight: 800, fontFamily: 'monospace', color: 'primary.dark' }}>
            #{truncateId(order.id).toUpperCase()}
          </Typography>
        </Stack>
        <div className="desktop-hide">
          <DeadlineBadge orderId={order.id} />
        </div>
      </div>

      <div className="card-body">
        <Stack spacing={0.5} sx={{ flex: 1 }}>
          <Typography variant="body1" sx={{ fontWeight: 700, color: 'text.primary' }}>
            {order.customerName}
          </Typography>
          {order.garmentName && (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {order.garmentName}
            </Typography>
          )}
          {order.groupName && (
            <Chip
              size="small"
              label={`Group: ${order.groupName}`}
              onClick={onGroupClick && order.groupOrderId ? (e) => { e.stopPropagation(); onGroupClick(order.groupOrderId!); } : undefined}
              sx={{ alignSelf: 'flex-start', fontWeight: 600 }}
            />
          )}
          <ActivationChips flags={order.unverifiedFlags} />
          {canRemind && (
            <Button
              size="small"
              variant="outlined"
              disabled={isReminding}
              onClick={(e) => {
                e.stopPropagation();
                sendReminder(order.id);
              }}
              sx={{ alignSelf: 'flex-start', mt: 1, borderRadius: 2, fontWeight: 700, fontSize: '11px' }}
            >
              {isReminding ? 'Sending…' : 'Remind customer'}
            </Button>
          )}
        </Stack>
        <div className="mobile-hide">
          <DeadlineBadge orderId={order.id} />
        </div>
      </div>

      <div className="card-footer">
        {order.eventDate && (
          <Stack spacing={0.5} sx={{ textAlign: { xs: 'left', md: 'right' } }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: 1 }}>
              DEADLINE
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 800, color: 'text.primary' }}>
              {new Date(order.eventDate).toLocaleDateString()}
            </Typography>
          </Stack>
        )}
        <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '10px' }}>
          {order.createdAt ? safeFormatDistanceToNow(order.createdAt) : 'In production'}
        </Typography>
      </div>
    </Box>
  );
};
