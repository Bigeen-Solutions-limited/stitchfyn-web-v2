import { useRef, useState } from 'react';
import { Stack, TextField, Button, CircularProgress } from '@mui/material';
import AddAPhotoOutlinedIcon from '@mui/icons-material/AddAPhotoOutlined';
import { useUploadProgressPhoto } from '../hooks/useWorkflowMutation';
import { MAX_PROGRESS_PHOTO_IMAGE_SIZE_BYTES } from '../progress-photo.api';
import { useToastStore } from '../../../components/feedback/Toast';

interface ProgressPhotoCaptureProps {
  garmentId: string;
  stageId: string;
}

/**
 * Staff Progress-Photo Capture UI — a new, dedicated component (not a
 * repurposing of FabricEvidenceCapturePanel, which stays garment/material-
 * intake-scoped). Reuses that panel's proven camera idiom only:
 * `<input type="file" accept="image/*" capture="environment">`, one tap,
 * automatic upload on selection, no separate "Upload" confirmation step.
 *
 * Deliberately diverges from FabricEvidenceCapturePanel's own inline-Alert
 * state machine — this component has NO local success/error UI at all.
 * Both surface through the workflow feature's existing global toast /
 * useDomainError() convention (see useUploadProgressPhoto's onSuccess/
 * onError), per the locked product decision to preserve that architecture
 * rather than introduce a second error-handling pattern.
 *
 * The optional note is entered BEFORE capture (there's no post-capture
 * confirm step to attach it at, since upload is automatic on selection).
 * It is never required — an empty note simply isn't sent.
 *
 * Server-authoritative: no optimistic photo is added locally. The parent
 * (WorkflowGraph) only renders this component at all when the stage is
 * active/actionable AND has fewer than the photo limit — once a
 * successful upload's query invalidation brings the count to 3, the
 * parent stops rendering this control entirely on its next render. The
 * backend's own createWithinLimit is the actual enforcement; this is a UX
 * optimization only.
 */
export function ProgressPhotoCapture({ garmentId, stageId }: ProgressPhotoCaptureProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [note, setNote] = useState('');
  const upload = useUploadProgressPhoto(garmentId);
  const showToast = useToastStore((s) => s.showToast);

  function resetInput() {
    if (inputRef.current) inputRef.current.value = '';
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_PROGRESS_PHOTO_IMAGE_SIZE_BYTES) {
      // Reject-and-recapture, per the locked product decision — never
      // compress/resize. This never reaches the mutation (nothing was
      // sent), so it's surfaced via the same global toast directly rather
      // than introducing a second, request-shaped error path for a
      // purely client-side check.
      showToast(
        'Photo Too Large',
        `That photo is ${(file.size / (1024 * 1024)).toFixed(1)}MB — the limit is 5MB. Please retake at a lower resolution.`,
        'error',
      );
      resetInput();
      return;
    }

    upload.mutate(
      { stageId, file, note: note.trim() || undefined },
      {
        onSuccess: () => {
          setNote('');
          resetInput();
        },
        onError: () => {
          resetInput();
        },
      },
    );
  }

  return (
    <Stack spacing={1} sx={{ mt: 1.5, maxWidth: 320 }}>
      <TextField
        size="small"
        placeholder="Note (optional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        disabled={upload.isPending}
        fullWidth
      />
      <Button
        component="label"
        variant="outlined"
        size="small"
        startIcon={upload.isPending ? <CircularProgress size={14} /> : <AddAPhotoOutlinedIcon fontSize="small" />}
        disabled={upload.isPending}
        sx={{ borderRadius: 2, fontWeight: 700, textTransform: 'none', alignSelf: 'flex-start' }}
      >
        {upload.isPending ? 'Uploading…' : 'Add Progress Photo'}
        <input
          ref={inputRef}
          type="file"
          hidden
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
        />
      </Button>
    </Stack>
  );
}
