import { formatDistanceToNow, isValid } from 'date-fns';

export function truncateId(id: string | undefined | null): string {
  if (!id) return '';
  if (id.length <= 8) return id;
  return `${id.slice(0, 4)}...${id.slice(-4)}`;
}

export function formatDeadline(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (!isValid(date)) return 'TBD';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return 'TBD';
  }
}

export function safeFormatDistanceToNow(dateInput: string | Date | undefined | null): string {
  if (!dateInput) return 'Recently';
  try {
    const date = new Date(dateInput);
    if (!isValid(date)) return 'Recently';
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return 'Recently';
  }
}

export function safeLocaleDate(dateInput: string | Date | undefined | null): string {
  if (!dateInput) return 'Historical record';
  try {
    const date = new Date(dateInput);
    if (!isValid(date)) return 'Historical record';
    return date.toLocaleString();
  } catch {
    return 'Historical record';
  }
}
