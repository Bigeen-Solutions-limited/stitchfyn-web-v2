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

// Takes a progress photo and uploads it straight away; success and errors show as toasts, and the optional note is typed before capture.
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
      // Too large: ask for a retake, never resize; nothing was sent, so show the toast directly
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
