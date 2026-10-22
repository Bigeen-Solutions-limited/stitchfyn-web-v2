import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { portalApi, type PortalMessage } from '../portal.api';

const MAX_CHARS = 1000;
const COUNTDOWN_THRESHOLD = 800;

interface Props {
  portalToken: string;
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-NG', {
    hour: '2-digit',
    minute: '2-digit',
    day: 'numeric',
    month: 'short',
  });
}

function MessageBubble({ message }: { message: PortalMessage }) {
  const isStaff = message.senderType === 'staff';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isStaff ? 'flex-end' : 'flex-start',
        marginBottom: 12,
      }}
    >
      <p
        style={{
          fontSize: '10px',
          textTransform: 'uppercase',
          fontWeight: 700,
          color: '#999',
          marginBottom: 4,
          letterSpacing: 0.6,
        }}
      >
        {isStaff ? message.senderName ?? 'Your tailor' : 'You'}
      </p>
      <div
        style={{
          maxWidth: '78%',
          padding: '10px 14px',
          borderRadius: isStaff ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
          background: isStaff ? '#1e5c3a' : '#f0f0ec',
          color: isStaff ? '#ffffff' : '#1a1a1a',
          fontSize: '0.92rem',
          lineHeight: 1.5,
          wordBreak: 'break-word',
        }}
      >
        {message.body}
      </div>
      <p style={{ fontSize: '10px', color: '#bbb', marginTop: 4 }}>
        {formatTime(message.sentAt)}
      </p>
    </div>
  );
}

export function PortalMessageThread({ portalToken }: Props) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const queryKey = ['portal', portalToken, 'messages'];

  const { data: messages = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => portalApi.getMessages(portalToken),
    refetchInterval: 30_000,
    retry: (failureCount, err: any) => {
      if (err?.response?.status === 404) return false;
      return failureCount < 2;
    },
  });

  const sendMutation = useMutation({
    mutationFn: (body: string) => portalApi.sendMessage(portalToken, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setDraft('');
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    },
  });

  function handleSend() {
    const trimmed = draft.trim();
    if (!trimmed || trimmed.length > MAX_CHARS || sendMutation.isPending) return;
    sendMutation.mutate(trimmed);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const charsLeft = MAX_CHARS - draft.length;
  const showCountdown = draft.length >= COUNTDOWN_THRESHOLD;

  return (
    <div className="sf-card" style={{ display: 'flex', flexDirection: 'column' }}>
      <h3 className="text-h3 mb-lg">Messages</h3>

      {/* Thread */}
      <div
        style={{
          flex: 1,
          minHeight: 160,
          maxHeight: 400,
          overflowY: 'auto',
          marginBottom: 16,
          paddingRight: 4,
        }}
      >
        {isLoading && (
          <p className="text-xs text-muted text-center" style={{ padding: '24px 0' }}>
            Loading messages…
          </p>
        )}
        {!isLoading && messages.length === 0 && (
          <p className="text-xs text-muted text-center" style={{ padding: '24px 0' }}>
            No messages yet. Send one below to reach your tailor.
          </p>
        )}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Compose */}
      <div style={{ borderTop: '1px solid #e5e0d8', paddingTop: 14 }}>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Write a message to your tailor… (Enter to send)"
          maxLength={MAX_CHARS}
          rows={3}
          style={{
            width: '100%',
            resize: 'none',
            padding: '10px 12px',
            borderRadius: 8,
            border: '1px solid #d0ccc6',
            fontSize: '0.9rem',
            fontFamily: 'inherit',
            lineHeight: 1.5,
            outline: 'none',
            background: '#faf9f7',
            boxSizing: 'border-box',
          }}
        />

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 8,
          }}
        >
          {showCountdown ? (
            <p
              style={{
                fontSize: '11px',
                color: charsLeft < 50 ? '#c0392b' : '#999',
                fontWeight: 600,
              }}
            >
              {charsLeft} characters remaining
            </p>
          ) : (
            <span />
          )}

          <button
            onClick={handleSend}
            disabled={!draft.trim() || draft.length > MAX_CHARS || sendMutation.isPending}
            style={{
              padding: '8px 20px',
              borderRadius: 8,
              border: 'none',
              background: '#1e5c3a',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.875rem',
              cursor: 'pointer',
              opacity: !draft.trim() || draft.length > MAX_CHARS || sendMutation.isPending ? 0.5 : 1,
              transition: 'opacity 0.15s',
            }}
          >
            {sendMutation.isPending ? 'Sending…' : 'Send'}
          </button>
        </div>

        {sendMutation.isError && (
          <p
            style={{ fontSize: '12px', color: '#c0392b', marginTop: 6 }}
          >
            Failed to send. Please try again.
          </p>
        )}
      </div>
    </div>
  );
}
