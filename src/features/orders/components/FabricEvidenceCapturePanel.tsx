import { useRef, useState } from 'react';
import {
  Box,
  Typography,
  Stack,
  Button,
  CircularProgress,
  Alert,
  Chip,
  alpha,
} from '@mui/material';
import PhotoCameraOutlinedIcon from '@mui/icons-material/PhotoCameraOutlined';
import ReplayIcon from '@mui/icons-material/Replay';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import { useMutation } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { fabricEvidenceApi, type FabricEvidencePhoto } from '../fabric-evidence.api';

interface FabricEvidenceCapturePanelProps {
  garmentId: string;
}

// @fastify/multipart is configured with a 5MB fileSize limit (app.ts). A
// typical modern phone camera photo can exceed this (a single 12MP+ JPEG
// is often 3-8MB), so this is checked client-side to fail fast with a
// clear message rather than silently attempting an upload that will 413.
// Per Slice 4 scope: no client-side compression is implemented, and the
// backend limit is not touched — this is validation only.
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

type CaptureState = 'idle' | 'uploading' | 'success' | 'error';

/**
 * Fabric Evidence Capture — Slice 4, revised for US-3.1 (single-tap capture)
 *
 * Deliberately separate from FabricSealPanel: this component only captures
 * and uploads fabric_evidence_photos rows via the Slice 3 endpoint. It
 * never sets garments.confirmed_at and never triggers a Fabric Safety
 * Seal — confirmation is a distinct, later, customer-facing step.
 *
 * State is per-garment (keyed by garmentId via the parent's `key` prop, see
 * OrderDetailPage) so garment A's captures are never conflated with
 * garment B's — each mounted instance of this component only ever knows
 * about its own garmentId.
 *
 * US-3.1: selecting/capturing a valid photo uploads it immediately — there
 * is no intermediate "ready" preview state and no separate Upload Photo
 * tap. The file input is only ever rendered while state === 'idle', so it
 * unmounts the instant a file is accepted, which is what actually prevents
 * a stray double `change` event (or a repeat tap on the — now-hidden —
 * capture button) from firing a second upload; the `state !== 'idle'`
 * guard at the top of handleFileChange is defense in depth for the same
 * event landing before that re-render commits.
 */
export function FabricEvidenceCapturePanel({ garmentId }: FabricEvidenceCapturePanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [state, setState] = useState<CaptureState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // Evidence uploaded THIS session — there is no GET endpoint for fabric
  // evidence yet (Slice 3 deliberately added creation only), so photos
  // uploaded in a prior session are not shown here on reload. See the
  // Slice 4 report's "unresolved risks" for this gap.
  const [uploadedPhotos, setUploadedPhotos] = useState<FabricEvidencePhoto[]>([]);

  const uploadMutation = useMutation<FabricEvidencePhoto, AxiosError<{ message?: string }>, File>({
    mutationFn: (file: File) => fabricEvidenceApi.uploadFabricEvidencePhoto(garmentId, file),
  });

  const isUploading = uploadMutation.isPending;

  function resetSelection() {
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setState('idle');
    setErrorMessage(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  function startUpload(file: File) {
    if (isUploading) return; // duplicate-submission guard
    setState('uploading');

    uploadMutation.mutate(file, {
      onSuccess: (photo) => {
        setUploadedPhotos((prev) => [...prev, photo]);
        setState('success');
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
        setSelectedFile(null);
        if (inputRef.current) inputRef.current.value = '';
      },
      onError: (error: AxiosError<{ message?: string }>) => {
        setState('error');
        const status = error.response?.status;
        if (status === 413) {
          setErrorMessage('That photo is too large for the server to accept. Please retake at a lower resolution.');
        } else if (status === 409) {
          setErrorMessage('This garment’s fabric has already been confirmed — new evidence can no longer be added.');
        } else {
          setErrorMessage(error.response?.data?.message || 'Upload failed. Please try again.');
        }
      },
    });
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (state !== 'idle') return; // belt-and-suspenders: the input is unmounted outside 'idle' anyway

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setSelectedFile(null);
      setPreviewUrl(null);
      setState('error');
      setErrorMessage(
        `That photo is ${(file.size / (1024 * 1024)).toFixed(1)}MB — the limit is 5MB. Please retake at a lower resolution or choose a smaller image.`,
      );
      return;
    }

    setErrorMessage(null);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    startUpload(file); // US-3.1: no separate Upload Photo tap — upload starts on selection
  }

  function handleRetry() {
    // Re-attempts the SAME already-selected file — no recapture needed.
    if (!selectedFile) return;
    startUpload(selectedFile);
  }

  return (
    <Box sx={{ pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
      <Typography
        variant="caption"
        sx={{ fontWeight: 800, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: 1, mb: 1.5, display: 'block' }}
      >
        Fabric Evidence Photos
      </Typography>

      {uploadedPhotos.length > 0 && (
        <Stack direction="row" spacing={1.5} flexWrap="wrap" sx={{ mb: 2 }}>
          {uploadedPhotos.map((photo) => (
            <Box
              key={photo.id}
              component="img"
              src={photo.secureUrl}
              alt="Uploaded fabric evidence"
              sx={{
                width: 72,
                height: 72,
                borderRadius: 2,
                objectFit: 'cover',
                border: '1px solid',
                borderColor: 'divider',
              }}
            />
          ))}
        </Stack>
      )}

      {state === 'idle' && (
        <Button
          component="label"
          variant="outlined"
          startIcon={<PhotoCameraOutlinedIcon />}
          sx={{ borderRadius: 2, fontWeight: 700, textTransform: 'none' }}
        >
          {uploadedPhotos.length > 0 ? 'Add Another Photo' : 'Capture Fabric Photo'}
          <input
            ref={inputRef}
            type="file"
            hidden
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
          />
        </Button>
      )}

      {/* US-3.1: upload starts automatically on selection — there is no
          preview/confirm step to stop at, just an in-progress indicator
          while the existing mutation runs. The button is disabled (not
          removed) so a duplicate tap during this window is a no-op rather
          than a second submission. */}
      {state === 'uploading' && previewUrl && (
        <Stack spacing={1.5} alignItems="flex-start">
          <Box
            component="img"
            src={previewUrl}
            alt="Fabric photo preview"
            sx={{ width: 160, height: 160, borderRadius: 2, objectFit: 'cover', border: '1px solid', borderColor: 'divider' }}
          />
          <Stack direction="row" spacing={1.5}>
            <Button
              variant="contained"
              disabled
              startIcon={<CircularProgress size={16} sx={{ color: 'white' }} />}
              sx={{ borderRadius: 2, fontWeight: 700, textTransform: 'none', bgcolor: '#1e5c3a' }}
            >
              Uploading…
            </Button>
          </Stack>
        </Stack>
      )}

      {state === 'success' && (
        <Alert
          icon={<CheckCircleOutlinedIcon fontSize="inherit" />}
          severity="success"
          sx={{ borderRadius: 2, mb: 1 }}
          action={
            <Button size="small" onClick={() => setState('idle')} sx={{ fontWeight: 700, textTransform: 'none' }}>
              Done
            </Button>
          }
        >
          Photo uploaded.
        </Alert>
      )}

      {state === 'error' && (
        <Stack spacing={1.5} alignItems="flex-start">
          {previewUrl && (
            <Box
              component="img"
              src={previewUrl}
              alt="Fabric photo preview"
              sx={{ width: 160, height: 160, borderRadius: 2, objectFit: 'cover', border: '1px solid', borderColor: 'divider' }}
            />
          )}
          <Alert severity="error" sx={{ borderRadius: 2, width: '100%' }}>
            {errorMessage}
          </Alert>
          <Stack direction="row" spacing={1.5}>
            {selectedFile && (
              <Button
                variant="contained"
                startIcon={<ReplayIcon />}
                onClick={handleRetry}
                sx={{ borderRadius: 2, fontWeight: 700, textTransform: 'none' }}
              >
                Retry
              </Button>
            )}
            <Button variant="text" onClick={resetSelection} sx={{ borderRadius: 2, fontWeight: 700, textTransform: 'none' }}>
              {selectedFile ? 'Retake Instead' : 'Try Again'}
            </Button>
          </Stack>
        </Stack>
      )}

      {uploadedPhotos.length > 0 && state === 'idle' && (
        <Chip
          size="small"
          label={`${uploadedPhotos.length} photo${uploadedPhotos.length > 1 ? 's' : ''} uploaded this session`}
          sx={{ mt: 1.5, fontWeight: 700, bgcolor: alpha('#1e5c3a', 0.08), color: '#1e5c3a' }}
        />
      )}
    </Box>
  );
}
