import { useState } from 'react';
import { Box, Stack, Dialog, IconButton, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import type { ProgressPhoto } from '../progress-photo.api';

// Only what is shown, so the customer portal's slimmer photos fit too
type ThumbnailPhoto = Pick<ProgressPhoto, 'id' | 'secureUrl' | 'note'>;

interface ProgressPhotoThumbnailsProps {
  photos: ThumbnailPhoto[];
}

// Read-only stage photos, tap to enlarge; there is no delete because photos are evidence.
export function ProgressPhotoThumbnails({ photos }: ProgressPhotoThumbnailsProps) {
  const [openPhoto, setOpenPhoto] = useState<ThumbnailPhoto | null>(null);

  if (photos.length === 0) return null;

  return (
    <>
      <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1 }}>
        {photos.map((photo) => (
          <Box
            key={photo.id}
            component="button"
            type="button"
            onClick={() => setOpenPhoto(photo)}
            sx={{
              p: 0,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1.5,
              overflow: 'hidden',
              cursor: 'pointer',
              lineHeight: 0,
              bgcolor: 'transparent',
            }}
          >
            <Box
              component="img"
              src={photo.secureUrl}
              alt="Progress photo"
              sx={{ width: 48, height: 48, objectFit: 'cover', display: 'block' }}
            />
          </Box>
        ))}
      </Stack>

      <Dialog open={!!openPhoto} onClose={() => setOpenPhoto(null)} maxWidth="sm" fullWidth>
        {openPhoto && (
          <Box sx={{ position: 'relative' }}>
            <IconButton
              onClick={() => setOpenPhoto(null)}
              sx={{ position: 'absolute', top: 8, right: 8, bgcolor: 'rgba(0,0,0,0.5)', color: 'white', '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' } }}
              size="small"
            >
              <CloseIcon fontSize="small" />
            </IconButton>
            <Box component="img" src={openPhoto.secureUrl} alt="Progress photo" sx={{ width: '100%', display: 'block' }} />
            {openPhoto.note && (
              <Box sx={{ p: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  {openPhoto.note}
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </Dialog>
    </>
  );
}
