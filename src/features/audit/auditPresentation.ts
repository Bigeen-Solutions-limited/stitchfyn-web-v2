import { safeLocaleDate } from '../../utils/format';
import type { AuditRecord } from './types';

// How one sealed metadata entry is shown. The stored record is never changed: it is part of the signature chain.
export type MetadataItem =
  | { key: string; kind: 'text'; label: string; text: string }
  | { key: string; kind: 'link'; label: string; href: string };

const URL_PATTERN = /^https?:\/\//i;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

// Internal references mean nothing to a reader; the record itself still holds them
function isInternalId(key: string): boolean {
  return key === 'id' || /(Id|_id|Ids)$/.test(key);
}

function humanize(key: string): string {
  const words = key
    .replace(/_/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function linkLabel(key: string): string {
  return /photo|image|evidence|secureurl/i.test(key) ? 'View photo' : 'View file';
}

export function presentMetadata(metadata: AuditRecord['metadata'] | null | undefined): MetadataItem[] {
  if (!metadata) return [];
  const items: MetadataItem[] = [];

  for (const [key, raw] of Object.entries(metadata as Record<string, unknown>)) {
    if (raw === null || raw === undefined || raw === '' || isInternalId(key)) continue;

    if (Array.isArray(raw)) {
      const urls = raw.filter((v): v is string => typeof v === 'string' && URL_PATTERN.test(v));
      urls.forEach((href, i) => {
        const base = linkLabel(key);
        items.push({ key: `${key}-${i}`, kind: 'link', label: urls.length > 1 ? `${base} ${i + 1}` : base, href });
      });
      const rest = raw.filter((v) => !(typeof v === 'string' && URL_PATTERN.test(v)));
      if (rest.length > 0) items.push({ key, kind: 'text', label: humanize(key), text: rest.join(', ') });
      continue;
    }

    if (typeof raw === 'string' && URL_PATTERN.test(raw)) {
      items.push({ key, kind: 'link', label: linkLabel(key), href: raw });
      continue;
    }

    let text: string;
    if (typeof raw === 'boolean') text = raw ? 'Yes' : 'No';
    else if (typeof raw === 'string' && ISO_DATE_PATTERN.test(raw)) text = safeLocaleDate(raw);
    else if (typeof raw === 'object') continue;
    else text = String(raw);

    items.push({ key, kind: 'text', label: humanize(key), text });
  }

  return items;
}

// Customer actions are sealed with a null actor, the same as automated ones
const CUSTOMER_ACTIONS = /^(CUSTOMER_|DESIGN_BRIEF_CONFIRMED$|DISPUTE_CUSTOMER_)/;

export function actorLabel(record: Pick<AuditRecord, 'actorId' | 'actorName' | 'action'>): string {
  if (record.actorName) return record.actorName;
  if (!record.actorId && CUSTOMER_ACTIONS.test(record.action)) return 'Customer';
  return 'System';
}
