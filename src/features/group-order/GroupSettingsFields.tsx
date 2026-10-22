import { useState } from 'react';
import { Autocomplete, MenuItem, Stack, TextField } from '@mui/material';
import { useStaffList, useStores } from '../auth/hooks/useStaff';
import { useCustomerSearch } from '../customers/hooks/useCustomerIntake';
import { useAuthStore } from '../auth/auth.store';
import type { GroupOrderInput } from './group-order.api';

interface Props {
  value: GroupOrderInput;
  onChange: (value: GroupOrderInput) => void;
  // The coordinator's current name, shown before anyone searches
  coordinatorName?: string | null;
}

// Name, event date, store, lead tailor and coordinator: shared by the create dialog and the group page
export function GroupSettingsFields({ value, onChange, coordinatorName }: Props) {
  const role = useAuthStore((s) => s.user?.role);
  const { data: stores = [] } = useStores();
  const { data: staff = [] } = useStaffList();
  const [coordinatorQuery, setCoordinatorQuery] = useState('');
  const { data: customers = [] } = useCustomerSearch(coordinatorQuery);

  const tailors = staff.filter((s) => s.role === 'TAILOR' && s.status !== 'REMOVED');
  const set = (patch: GroupOrderInput) => onChange({ ...value, ...patch });

  const coordinatorOptions = [
    ...(value.coordinatorCustomerId && coordinatorName ? [{ id: value.coordinatorCustomerId, name: coordinatorName }] : []),
    ...customers.filter((c) => c.id !== value.coordinatorCustomerId).map((c) => ({ id: c.id, name: c.name })),
  ];

  return (
    <Stack spacing={2.5}>
      <TextField
        label="Group name"
        value={value.name ?? ''}
        onChange={(e) => set({ name: e.target.value })}
        required
        fullWidth
        size="small"
        placeholder="e.g. Nwachukwu family burial"
      />
      <TextField
        label="Event date"
        type="date"
        value={value.eventDate ? value.eventDate.slice(0, 10) : ''}
        onChange={(e) => set({ eventDate: e.target.value })}
        required
        fullWidth
        size="small"
        slotProps={{ inputLabel: { shrink: true } }}
      />
      {role === 'OWNER' && (
        <TextField
          select
          label="Store"
          value={value.storeId ?? ''}
          onChange={(e) => set({ storeId: e.target.value || null })}
          fullWidth
          size="small"
          helperText="Every order in the group is made here"
        >
          <MenuItem value="">Not set</MenuItem>
          {stores.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
        </TextField>
      )}
      <TextField
        select
        label="Lead tailor"
        value={value.leadTailorId ?? ''}
        onChange={(e) => set({ leadTailorId: e.target.value || null })}
        fullWidth
        size="small"
        helperText="Takes every garment in the group nobody is assigned to"
      >
        <MenuItem value="">Not set</MenuItem>
        {tailors.map((t) => <MenuItem key={t.id} value={t.id}>{t.fullName}</MenuItem>)}
      </TextField>
      <Autocomplete
        size="small"
        options={coordinatorOptions}
        getOptionLabel={(o) => o.name}
        isOptionEqualToValue={(a, b) => a.id === b.id}
        value={coordinatorOptions.find((o) => o.id === value.coordinatorCustomerId) ?? null}
        onChange={(_, o) => set({ coordinatorCustomerId: o?.id ?? null })}
        onInputChange={(_, text) => setCoordinatorQuery(text)}
        filterOptions={(x) => x}
        noOptionsText={coordinatorQuery.length < 2 ? 'Type a client name' : 'No clients found'}
        renderInput={(params) => <TextField {...params} label="Coordinator (client)" helperText="Gets the shared group link" />}
      />
    </Stack>
  );
}
