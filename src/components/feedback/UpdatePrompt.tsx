import { Button, Snackbar } from '@mui/material';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { BRAND_NAME } from '../../config/brand';

// When a new version is deployed, offer a reload instead of leaving people on the old app until a later visit
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  return (
    <Snackbar
      open={needRefresh}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      message={`A new version of ${BRAND_NAME} is available.`}
      action={
        <>
          <Button color="inherit" size="small" onClick={() => setNeedRefresh(false)}>
            Later
          </Button>
          <Button color="secondary" size="small" variant="contained" onClick={() => updateServiceWorker(true)} sx={{ fontWeight: 700 }}>
            Reload
          </Button>
        </>
      }
    />
  );
}
