import React, { useState } from 'react';
import {
  IconButton,
  Badge,
  Drawer,
  Box,
  Typography,
  Stack,
  Button,
  CircularProgress,
  Divider,
  alpha,
} from '@mui/material';
import {
  Notifications as BellIcon,
  NotificationsNone as BellOutlineIcon,
  DoneAll as DoneAllIcon,
  Circle as DotIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi, type UserNotification } from '../notifications.api';
import { TEMPLATE_META } from '../notifications.types';
import type { NotificationTemplateKey } from '../notifications.types';
import { keys } from '../../../query/keys';
import { safeFormatDistanceToNow } from '../../../utils/format';

function NotificationRow({
  item,
  onRead,
}: {
  item: UserNotification;
  onRead: (id: string) => void;
}) {
  const meta =
    TEMPLATE_META[item.templateKey as NotificationTemplateKey] ??
    ({ title: item.templateKey, body: () => '' } as any);

  const isUnread = !item.readAt;

  return (
    <Box
      onClick={() => isUnread && onRead(item.id)}
      sx={{
        px: 2.5,
        py: 1.75,
        cursor: isUnread ? 'pointer' : 'default',
        bgcolor: isUnread ? alpha('#1e5c3a', 0.04) : 'transparent',
        borderLeft: isUnread ? '3px solid #1e5c3a' : '3px solid transparent',
        transition: 'background-color 0.15s',
        '&:hover': isUnread ? { bgcolor: alpha('#1e5c3a', 0.08) } : {},
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="flex-start">
        <Box sx={{ pt: 0.25, flexShrink: 0 }}>
          {isUnread ? (
            <DotIcon sx={{ fontSize: 10, color: '#1e5c3a', mt: 0.5 }} />
          ) : (
            <Box sx={{ width: 10 }} />
          )}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="body2"
            fontWeight={isUnread ? 700 : 500}
            sx={{ lineHeight: 1.3, mb: 0.25 }}
            noWrap
          >
            {meta.title}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: 'block', lineHeight: 1.4 }}
          >
            {meta.body(item.payload)}
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: 'text.disabled', fontSize: '10px', display: 'block', mt: 0.5 }}
          >
            {safeFormatDistanceToNow(item.createdAt)}
          </Typography>
        </Box>
      </Stack>
    </Box>
  );
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: keys.notifications.list,
    queryFn: notificationsApi.list,
    refetchInterval: 60_000,
  });

  const markRead = useMutation({
    mutationFn: notificationsApi.markRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.notifications.list }),
  });

  const markAllRead = useMutation({
    mutationFn: notificationsApi.markAllRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.notifications.list }),
  });

  const unreadCount = data?.unreadCount ?? 0;
  const items = data?.items ?? [];

  return (
    <>
      <IconButton
        size="small"
        onClick={() => setOpen(true)}
        sx={{ color: 'var(--color-text-secondary)' }}
      >
        <Badge badgeContent={unreadCount > 0 ? unreadCount : undefined} color="error" max={99}>
          {unreadCount > 0 ? (
            <BellIcon sx={{ fontSize: 20 }} />
          ) : (
            <BellOutlineIcon sx={{ fontSize: 20 }} />
          )}
        </Badge>
      </IconButton>

      <Drawer
        anchor="right"
        open={open}
        onClose={() => setOpen(false)}
        PaperProps={{
          sx: {
            width: { xs: '100vw', sm: 380 },
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        {/* Header */}
        <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" fontWeight={800} sx={{ fontSize: '1rem' }}>
              Notifications
            </Typography>
            {unreadCount > 0 && (
              <Button
                size="small"
                startIcon={<DoneAllIcon sx={{ fontSize: 16 }} />}
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
                sx={{
                  textTransform: 'none',
                  fontSize: '12px',
                  color: '#1e5c3a',
                  fontWeight: 600,
                  '&:hover': { bgcolor: alpha('#1e5c3a', 0.06) },
                }}
              >
                Mark all read
              </Button>
            )}
          </Stack>
          {unreadCount > 0 && (
            <Typography variant="caption" color="text.secondary">
              {unreadCount} unread
            </Typography>
          )}
        </Box>

        {/* Content */}
        <Box sx={{ flex: 1, overflowY: 'auto' }}>
          {isLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress size={24} />
            </Box>
          )}

          {!isLoading && items.length === 0 && (
            <Box sx={{ py: 8, textAlign: 'center' }}>
              <BellOutlineIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1.5 }} />
              <Typography variant="body2" color="text.secondary" fontWeight={500}>
                No notifications yet
              </Typography>
              <Typography variant="caption" color="text.disabled">
                Device alerts and order updates will appear here.
              </Typography>
            </Box>
          )}

          {!isLoading && items.length > 0 && (
            <Box>
              {items.map((item, idx) => (
                <React.Fragment key={item.id}>
                  <NotificationRow
                    item={item}
                    onRead={(id) => markRead.mutate(id)}
                  />
                  {idx < items.length - 1 && (
                    <Divider sx={{ mx: 2.5 }} />
                  )}
                </React.Fragment>
              ))}
            </Box>
          )}
        </Box>

        {/* Footer */}
        <Box sx={{ px: 2.5, py: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
          <Typography variant="caption" color="text.disabled" sx={{ fontSize: '10px' }}>
            Showing last 50 notifications
          </Typography>
        </Box>
      </Drawer>
    </>
  );
}
