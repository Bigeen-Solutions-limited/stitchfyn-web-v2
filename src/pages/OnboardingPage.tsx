import { useState } from 'react';
import { isAxiosError } from 'axios';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Alert, Box, Button, Card, Chip, List, ListItem, ListItemIcon, ListItemText, MenuItem, Stack, Step, StepLabel,
  Stepper, TextField, Typography,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import {
  useCompleteOnboarding, useOnboardingStatus, useRefreshOnboarding, useSaveWorkshop,
} from '../features/onboarding/hooks/useOnboarding';
import type { OnboardingStatus, ReadinessStep } from '../features/onboarding/onboarding.api';
import { useCreateTemplate, useWorkflowTemplates } from '../features/workflow/hooks/useWorkflowTemplates';
import { latestGraph, linearOrder } from '../features/workflow/stage-order';
import { useInviteStaff, useStaffList } from '../features/auth/hooks/useStaff';
import { ASSIGNABLE_STAFF_ROLES, ROLE_LABELS } from '../features/auth/staff.api';
import { InviteLinkDialog } from '../features/auth/components/InviteLinkDialog';
import { QueryError, QueryLoading } from '../components/feedback/QueryState';
import { parseApiError } from '../lib/errors/parse-api-error';
import { useDomainError } from '../lib/errors/use-domain-error';

// First-time setup for an owner: the workshop, production stages and a first team member, so an order can be taken.
// The server decides what "done" means (GET /onboarding); each step saves as it goes, so the owner can leave and resume.
const STEPS: { key: ReadinessStep | 'ready'; label: string }[] = [
  { key: 'workshop', label: 'Your workshop' },
  { key: 'workflow', label: 'Production stages' },
  { key: 'staff', label: 'Your team' },
  { key: 'ready', label: 'Ready' },
];

const STEP_NAMES: Record<ReadinessStep, string> = {
  workshop: 'Workshop address and capacity',
  workflow: 'Production stages',
  staff: 'At least one team member',
};

function firstOpenStep(status: OnboardingStatus): number {
  const open = STEPS.findIndex((s) => s.key !== 'ready' && !status.steps[s.key]);
  return open === -1 ? STEPS.length - 1 : open;
}

export function OnboardingPage() {
  const { data: status, isLoading, isError, refetch } = useOnboardingStatus();
  // Resume at the first step that isn't done, chosen once when the status first arrives. After that the step only
  // changes when the owner moves, so finishing a step (inviting someone) doesn't jump past it before they're ready.
  const [active, setActive] = useState<number | null>(null);
  if (status && active === null) setActive(firstOpenStep(status));

  if (isLoading || active === null) return <QueryLoading label="Loading your setup…" />;
  if (isError || !status) return <QueryError onRetry={refetch} />;

  const step = active;
  const next = () => setActive(Math.min(step + 1, STEPS.length - 1));

  return (
    <Box className="container" sx={{ pt: { xs: 2, md: 4 }, pb: 8, maxWidth: 760, mx: 'auto' }}>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>Set up {status.companyName}</Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        A few details and you'll be ready to take your first order.
      </Typography>

      <Stepper activeStep={step} alternativeLabel sx={{ mb: 3 }}>
        {STEPS.map((s, i) => (
          <Step key={s.key} completed={s.key !== 'ready' && status.steps[s.key]} onClick={() => setActive(i)} sx={{ cursor: 'pointer' }}>
            <StepLabel>{s.label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <Card sx={{ p: { xs: 2, md: 3 }, borderRadius: '16px' }}>
        {STEPS[step].key === 'workshop' && <WorkshopStep status={status} onDone={next} />}
        {STEPS[step].key === 'workflow' && <WorkflowStep done={status.steps.workflow} onDone={next} />}
        {STEPS[step].key === 'staff' && <TeamStep status={status} onDone={next} />}
        {STEPS[step].key === 'ready' && <ReadyStep status={status} onGoTo={setActive} />}
      </Card>
    </Box>
  );
}

// The company and workshop names were set when the business was created on StitchFYN; the owner adds what wasn't
function WorkshopStep({ status, onDone }: { status: OnboardingStatus; onDone: () => void }) {
  const save = useSaveWorkshop();
  const [form, setForm] = useState({
    storeAddress: status.defaultStore.locationAddress ?? '',
    maxGarmentCapacity: String(status.defaultStore.maxGarmentCapacity),
    dailyCapacityHours: String(status.defaultStore.dailyCapacityHours),
  });
  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [field]: e.target.value });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    save.mutate(
      {
        storeAddress: form.storeAddress,
        maxGarmentCapacity: Number(form.maxGarmentCapacity),
        dailyCapacityHours: Number(form.dailyCapacityHours),
      },
      { onSuccess: onDone },
    );
  };

  return (
    <Box component="form" onSubmit={submit}>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Your workshop</Typography>
      <Stack spacing={2}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField label="Business name" value={status.companyName} fullWidth InputProps={{ readOnly: true }} />
          <TextField label="Workshop name" value={status.defaultStore.name} fullWidth InputProps={{ readOnly: true }} />
        </Stack>
        <Typography variant="caption" color="text.secondary">
          These were set when your business was created on StitchFYN. Contact support to change them.
        </Typography>
        <TextField label="Workshop address" value={form.storeAddress} onChange={set('storeAddress')} required fullWidth multiline minRows={2} />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField label="Garments in production at once" type="number" value={form.maxGarmentCapacity}
            onChange={set('maxGarmentCapacity')} required fullWidth inputProps={{ min: 1, max: 1000, step: 1 }}
            helperText="New orders warn you when you're at this limit" />
          <TextField label="Working hours a day" type="number" value={form.dailyCapacityHours}
            onChange={set('dailyCapacityHours')} required fullWidth inputProps={{ min: 1, max: 24, step: 1 }} />
        </Stack>
        {save.isError && <Alert severity="error">{parseApiError(save.error).detail}</Alert>}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button type="submit" variant="contained" disabled={save.isPending}>
            {save.isPending ? 'Saving…' : 'Save and continue'}
          </Button>
        </Box>
      </Stack>
    </Box>
  );
}

function WorkflowStep({ done, onDone }: { done: boolean; onDone: () => void }) {
  const { data: templates = [] } = useWorkflowTemplates();
  const createTemplate = useCreateTemplate();
  const refresh = useRefreshOnboarding();

  const useStandard = () =>
    createTemplate.mutate(
      { name: 'Standard production', description: 'Created during setup' },
      { onSuccess: async () => { await refresh(); onDone(); } },
    );

  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Production stages</Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        Each garment moves through these stages, and your team marks each one done as they work.
      </Typography>

      {templates.map((t) => (
        <Box key={t.id} sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
            {t.name}{t.companyId === null && ' (shared)'}
          </Typography>
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            {(linearOrder(latestGraph(t)) ?? []).map((node) => <Chip key={node.id} label={node.name} size="small" />)}
          </Stack>
        </Box>
      ))}

      {!done && (
        <Alert severity="info" sx={{ mb: 2 }}>
          You don't have production stages yet. Start with the standard stages; you can rename, add or reorder them later.
        </Alert>
      )}

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="flex-end">
        <Button component={RouterLink} to="/workflow-templates" variant="text">Customise stages</Button>
        {done ? (
          <Button variant="contained" onClick={onDone}>Continue</Button>
        ) : (
          <Button variant="contained" onClick={useStandard} disabled={createTemplate.isPending}>
            {createTemplate.isPending ? 'Creating…' : 'Use the standard stages'}
          </Button>
        )}
      </Stack>
    </Box>
  );
}

function TeamStep({ status, onDone }: { status: OnboardingStatus; onDone: () => void }) {
  const { data: staff = [] } = useStaffList();
  const invite = useInviteStaff();
  const refresh = useRefreshOnboarding();
  const [form, setForm] = useState({ fullName: '', email: '', role: 'TAILOR' });
  const [link, setLink] = useState<{ url: string; name: string; email: string } | null>(null);
  const team = staff.filter((s) => s.role !== 'OWNER' && s.status !== 'REMOVED');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    invite.mutate(
      { ...form, storeId: status.defaultStore.id },
      {
        onSuccess: async (created) => {
          setLink({ url: created.inviteUrl, name: created.fullName, email: created.email });
          setForm({ fullName: '', email: '', role: form.role });
          await refresh();
        },
      },
    );
  };

  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Your team</Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        Invite at least one person. They get an email with a link to set their password; you can also share the link yourself.
      </Typography>

      <Box component="form" onSubmit={submit}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField label="Full name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required fullWidth />
          <TextField label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required fullWidth />
          <TextField select label="Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} sx={{ minWidth: 150 }}>
            {ASSIGNABLE_STAFF_ROLES.map((r) => <MenuItem key={r} value={r}>{ROLE_LABELS[r]}</MenuItem>)}
          </TextField>
        </Stack>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
          <Button type="submit" variant="outlined" disabled={invite.isPending}>
            {invite.isPending ? 'Sending…' : 'Send invite'}
          </Button>
        </Box>
      </Box>

      {team.length > 0 && (
        <List dense sx={{ mt: 1 }}>
          {team.map((s) => (
            <ListItem key={s.id} disableGutters>
              <ListItemText primary={s.fullName} secondary={`${ROLE_LABELS[s.role] ?? s.role} · ${s.status === 'INVITED' ? 'Invited' : 'Active'}`} />
            </ListItem>
          ))}
        </List>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
        <Button variant="contained" onClick={onDone} disabled={!status.steps.staff}>Continue</Button>
      </Box>

      {link && (
        <InviteLinkDialog open inviteUrl={link.url} name={link.name} email={link.email} onClose={() => setLink(null)} />
      )}
    </Box>
  );
}

function ReadyStep({ status, onGoTo }: { status: OnboardingStatus; onGoTo: (step: number) => void }) {
  const complete = useCompleteOnboarding();
  const navigate = useNavigate();
  const { handleError } = useDomainError();
  const steps = Object.keys(STEP_NAMES) as ReadinessStep[];
  const allDone = steps.every((s) => status.steps[s]);

  const finish = () =>
    complete.mutate(undefined, {
      onSuccess: () => navigate('/orders/new'),
      onError: (err) => {
        // 409: the server names what's still missing, shown below the checklist
        if (!(isAxiosError(err) && err.response?.status === 409)) handleError(err);
      },
    });

  const missing: ReadinessStep[] = isAxiosError<{ metadata?: { missing?: ReadinessStep[] } }>(complete.error)
    ? complete.error.response?.data?.metadata?.missing ?? []
    : [];

  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
        {status.completedAt ? 'You are set up' : allDone ? 'Ready for your first order' : 'Almost there'}
      </Typography>
      <List dense>
        {steps.map((s) => (
          <ListItem key={s} disableGutters secondaryAction={!status.steps[s] && (
            <Button size="small" onClick={() => onGoTo(STEPS.findIndex((x) => x.key === s))}>Do this</Button>
          )}>
            <ListItemIcon sx={{ minWidth: 32 }}>
              {status.steps[s] ? <CheckCircleIcon color="success" fontSize="small" /> : <RadioButtonUncheckedIcon fontSize="small" />}
            </ListItemIcon>
            <ListItemText primary={STEP_NAMES[s]} />
          </ListItem>
        ))}
      </List>
      {missing.length > 0 && (
        <Alert severity="warning" sx={{ mt: 1 }}>
          Still to do: {missing.map((m) => STEP_NAMES[m]).join(', ')}.
        </Alert>
      )}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
        <Button variant="contained" onClick={finish} disabled={!allDone || complete.isPending}>
          {complete.isPending ? 'Finishing…' : 'Finish and take your first order'}
        </Button>
      </Box>
    </Box>
  );
}
