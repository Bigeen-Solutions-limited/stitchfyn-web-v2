import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Box, Button, Chip, Stack, TextField, Typography, alpha } from "@mui/material"
import { orderMessagesApi } from "../order-messages.api"
import { useDomainError } from "../../../lib/errors"

const MAX_CHARS = 1000

// The customer's messages for this order, with a reply box for staff
export function OrderMessageThread({ orderId }: { orderId: string }) {
  const queryClient = useQueryClient()
  const { handleError } = useDomainError()
  const [draft, setDraft] = useState("")
  const queryKey = ["orders", orderId, "messages"]

  const { data: messages = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => orderMessagesApi.getThread(orderId),
    refetchInterval: 30_000,
  })

  const reply = useMutation({
    mutationFn: (body: string) => orderMessagesApi.reply(orderId, body),
    onSuccess: () => {
      setDraft("")
      queryClient.invalidateQueries({ queryKey })
    },
    onError: (err) => handleError(err),
  })

  const send = () => {
    const body = draft.trim()
    if (body) reply.mutate(body)
  }

  return (
    <Box>
      <Typography variant="caption" color="text.secondary" fontWeight={800} sx={{ textTransform: "uppercase", display: "block", mb: 1.5 }}>
        Customer messages
      </Typography>

      {isLoading ? (
        <Typography variant="body2" color="text.secondary">Loading…</Typography>
      ) : messages.length === 0 ? (
        <Typography variant="body2" color="text.secondary">No messages yet.</Typography>
      ) : (
        <Stack spacing={1.5} sx={{ mb: 2, maxHeight: 360, overflowY: "auto" }}>
          {messages.map((m) => {
            const fromStaff = m.senderType === "staff"
            return (
              <Box key={m.id} sx={{ display: "flex", flexDirection: "column", alignItems: fromStaff ? "flex-end" : "flex-start" }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                  <Typography variant="caption" fontWeight={700}>{m.senderName}</Typography>
                  <Typography variant="caption" color="text.secondary">{new Date(m.sentAt).toLocaleString()}</Typography>
                  {m.isUrgent && (
                    <Chip label="URGENT · COUNTDOWN" size="small" color="error" sx={{ height: 18, fontSize: "0.6rem", fontWeight: 800 }} />
                  )}
                </Stack>
                <Box
                  sx={{
                    maxWidth: "80%",
                    px: 1.75,
                    py: 1.25,
                    borderRadius: 2,
                    bgcolor: fromStaff ? "#1e5c3a" : m.isUrgent ? alpha("#d32f2f", 0.08) : "#f0f0ec",
                    color: fromStaff ? "#fff" : "text.primary",
                    border: m.isUrgent ? "1px solid" : "none",
                    borderColor: "error.light",
                    wordBreak: "break-word",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  <Typography variant="body2">{m.body}</Typography>
                </Box>
              </Box>
            )
          })}
        </Stack>
      )}

      <Stack direction="row" spacing={1} alignItems="flex-end">
        <TextField
          fullWidth
          multiline
          maxRows={4}
          size="small"
          placeholder="Reply to the customer…"
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, MAX_CHARS))}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              send()
            }
          }}
        />
        <Button variant="contained" onClick={send} disabled={!draft.trim() || reply.isPending} sx={{ bgcolor: "#1e5c3a", fontWeight: 700 }}>
          Send
        </Button>
      </Stack>
    </Box>
  )
}
