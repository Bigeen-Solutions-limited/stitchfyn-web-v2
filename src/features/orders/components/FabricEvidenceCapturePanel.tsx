import { useEffect, useRef, useState } from 'react';
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
import CloudOffOutlinedIcon from '@mui/icons-material/CloudOffOutlined';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import { useMutation } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { fabricEvidenceApi, MAX_FABRIC_EVIDENCE_IMAGE_SIZE_BYTES, type FabricEvidencePhoto } from '../fabric-evidence.api';
import { getDeviceId } from '../../../lib/device-id';
import { enqueuePendingEvidence, OversizedFabricEvidenceError } from '../offline/fabric-evidence-offline-db';
import { retryFabricEvidenceItem } from '../offline/fabric-evidence-sync-manager';
import { useFabricEvidenceOfflineQueue } from '../offline/useFabricEvidenceOfflineQueue';
import { PHOTO_ACCEPT } from '../../../utils/photo';

interface FabricEvidenceCapturePanelProps {
  garmentId: string;
}

// Same limit as the server; checked here so oversized phone photos are rejected before uploading, never resized.
const MAX_FILE_SIZE_BYTES = MAX_FABRIC_EVIDENCE_IMAGE_SIZE_BYTES;

type CaptureState = 'idle' | 'uploading' | 'success' | 'error' | 'queued';

interface CaptureAttempt {
  clientId: string;
  deviceCapturedAt: string;
}

function PendingEvidenceThumbnail({ file }: { file: File }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);
  if (!url) return null;
  return (
    <Box
      component="img"
      src={url}
      alt="Fabric photo pending sync"
      sx={{ width: 56, height: 56, borderRadius: 2, objectFit: 'cover', border: '1px solid', borderColor: 'divider', opacity: 0.85 }}
    />
  );
}

// Uploads fabric photos for one garment the moment they are taken; it never confirms the fabric or creates a seal.
export function FabricEvidenceCapturePanel({ garmentId }: FabricEvidenceCapturePanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [state, setState] = useState<CaptureState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // Only this session's uploads: there is no endpoint yet to list earlier ones.
  const [uploadedPhotos, setUploadedPhotos] = useState<FabricEvidencePhoto[]>([]);
  // One key per photo, so a retry is recognised by the server as the same upload, not a duplicate.
  const [captureAttempt, setCaptureAttempt] = useState<CaptureAttempt | null>(null);

  // Photos saved offline for this garment; they survive a reload and join uploadedPhotos once synced.
  const pendingItems = useFabricEvidenceOfflineQueue(garmentId, (photo) => {
    setUploadedPhotos((prev) => (prev.some((p) => p.id === photo.id) ? prev : [...prev, photo]));
  });

  const uploadMutation = useMutation<
    FabricEvidencePhoto,
    AxiosError<{ message?: string }>,
    { file: File; idempotency: CaptureAttempt }
  >({
    mutationFn: ({ file, idempotency }) =>
      fabricEvidenceApi.uploadFabricEvidencePhoto(garmentId, file, {
        clientId: idempotency.clientId,
        deviceId: getDeviceId(),
        deviceCapturedAt: idempotency.deviceCapturedAt,
      }),
  });

  const isUploading = uploadMutation.isPending;

  function resetSelection() {
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setState('idle');
    setErrorMessage(null);
    setCaptureAttempt(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  function startUpload(file: File, idempotency: CaptureAttempt) {
    if (isUploading) return; // duplicate-submission guard
    setState('uploading');

    uploadMutation.mutate(
      { file, idempotency },
      {
        onSuccess: (photo) => {
          setUploadedPhotos((prev) => [...prev, photo]);
          setState('success');
          if (previewUrl) URL.revokeObjectURL(previewUrl);
          setPreviewUrl(null);
          setSelectedFile(null);
          setCaptureAttempt(null);
          if (inputRef.current) inputRef.current.value = '';
        },
        onError: async (error: AxiosError<{ message?: string }>) => {
          const status = error.response?.status;

          if (!status) {
            // No response means we are offline, so save the photo to sync later.
            try {
              await enqueuePendingEvidence({
                id: idempotency.clientId,
                garmentId,
                deviceId: getDeviceId(),
                imageFile: file,
                deviceCapturedAt: idempotency.deviceCapturedAt,
              });
              setState('queued');
              if (previewUrl) URL.revokeObjectURL(previewUrl);
              setPreviewUrl(null);
              setSelectedFile(null);
              setCaptureAttempt(null);
              if (inputRef.current) inputRef.current.value = '';
            } catch (enqueueError) {
              // Saving offline failed (too large, or device storage full/blocked), so say so honestly.
              setState('error');
              setErrorMessage(
                enqueueError instanceof OversizedFabricEvidenceError
                  ? enqueueError.message
                  : 'Could not save this photo for offline sync on this device. Please try again once you’re back online.',
              );
            }
            return;
          }

          setState('error');
          if (status === 413) {
            setErrorMessage('That photo is too large for the server to accept. Please retake at a lower resolution.');
          } else if (status === 409) {
            setErrorMessage('This garment’s fabric has already been confirmed — new evidence can no longer be added.');
          } else {
            setErrorMessage(error.response?.data?.message || 'Upload failed. Please try again.');
          }
        },
      },
    );
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (state !== 'idle') return; // ignore a second tap that lands before the input disappears

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
    // Made once at capture time so every retry carries the same key and capture time.
    const idempotency: CaptureAttempt = { clientId: crypto.randomUUID(), deviceCapturedAt: new Date().toISOString() };
    setCaptureAttempt(idempotency);
    startUpload(file, idempotency);
  }

  function handleRetry() {
    if (!selectedFile || !captureAttempt) return;
    startUpload(selectedFile, captureAttempt);
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

      {pendingItems.length > 0 && (
        <Stack spacing={1} sx={{ mb: 2 }}>
          {pendingItems.map((item) => (
            <Stack
              key={item.id}
              direction="row"
              spacing={1.5}
              alignItems="center"
              sx={{ p: 1, borderRadius: 2, bgcolor: alpha('#000', 0.03) }}
            >
              <PendingEvidenceThumbnail file={item.imageFile} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                {item.status === 'pending' && (
                  <Chip
                    size="small"
                    icon={<CloudOffOutlinedIcon />}
                    label="Saved offline — pending sync"
                    sx={{ fontWeight: 700, bgcolor: alpha('#c49a1a', 0.12), color: '#8a6d13' }}
                  />
                )}
                {item.status === 'syncing' && (
                  <Chip
                    size="small"
                    icon={<CircularProgress size={12} />}
                    label="Syncing…"
                    sx={{ fontWeight: 700, bgcolor: alpha('#1e5c3a', 0.1), color: '#1e5c3a' }}
                  />
                )}
                {item.status === 'failed' && (
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                    <Chip
                      size="small"
                      icon={<CloudUploadOutlinedIcon />}
                      label={item.errorMessage || 'Sync failed'}
                      sx={{ fontWeight: 700, bgcolor: alpha('#d32f2f', 0.1), color: '#d32f2f' }}
                    />
                    <Button
                      size="small"
                      startIcon={<ReplayIcon />}
                      onClick={() => retryFabricEvidenceItem(item.id, garmentId)}
                      sx={{ fontWeight: 700, textTransform: 'none' }}
                    >
                      Retry
                    </Button>
                  </Stack>
                )}
              </Box>
            </Stack>
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
            accept={PHOTO_ACCEPT}
            capture="environment"
            onChange={handleFileChange}
          />
        </Button>
      )}

      {/* Disabled rather than hidden, so a second tap while uploading does nothing. */}
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

      {state === 'queued' && (
        <Alert
          icon={<CloudOffOutlinedIcon fontSize="inherit" />}
          severity="info"
          sx={{ borderRadius: 2, mb: 1 }}
          action={
            <Button size="small" onClick={() => setState('idle')} sx={{ fontWeight: 700, textTransform: 'none' }}>
              OK
            </Button>
          }
        >
          Saved offline — this photo will sync automatically once you're back online.
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
