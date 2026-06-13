import { BadRequestError } from './errors';

/** Fuseau pour comparer « aujourd’hui » et l’heure courante aux créneaux (wall time du lieu). */
export function getAppTimeZone(): string {
  return process.env.APP_TIMEZONE?.trim() || 'Africa/Tunis';
}

/** Normalise une date `YYYY-M-D` ou `YYYY-MM-DD` vers `YYYY-MM-DD`. */
export function normalizeCalendarYmd(ymd: string): string {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(ymd.trim());
  if (!m) return ymd.trim();
  return `${m[1]}-${m[2]!.padStart(2, '0')}-${m[3]!.padStart(2, '0')}`;
}

/**
 * Date calendaire YYYY-MM-DD dans le fuseau donné (formatToParts évite les variations MM/JJ/AAAA selon l’OS).
 */
export function calendarDateYmdInTimeZone(isoDate: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(isoDate);
  const y = parts.find((p) => p.type === 'year')?.value;
  const mo = parts.find((p) => p.type === 'month')?.value;
  const d = parts.find((p) => p.type === 'day')?.value;
  if (y && mo && d) {
    return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  const raw = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(isoDate);
  return normalizeCalendarYmd(raw.replace(/\//g, '-'));
}

function hhmmToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Heure actuelle (h + min) en minutes depuis minuit, heure murale du fuseau.
 * `sv-SE` produit un horaire 24h stable (évite les bugs formatToParts / hour12 sur Windows).
 */
export function wallClockMinutesFromMidnightInTimeZone(now: Date, timeZone: string): number {
  const formatted = new Intl.DateTimeFormat('sv-SE', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(now);
  const match = /^(\d{1,2}):(\d{2})/.exec(formatted.trim());
  if (!match) {
    return now.getUTCHours() * 60 + now.getUTCMinutes();
  }
  return Number(match[1]) * 60 + Number(match[2]);
}

/**
 * Si `queryDateYmd` est aujourd’hui dans le fuseau, exclut les créneaux dont l’heure de début
 * est strictement avant l’heure actuelle (ex. à 19h27, plus de 8h–9h ni 19h–20h si le créneau commence à 19h00).
 */
export function omitPastSlotsForToday<T extends { startTime: string }>(
  slots: T[],
  queryDateYmd: string,
  now: Date,
  timeZone: string,
): T[] {
  const today = calendarDateYmdInTimeZone(now, timeZone);
  if (today !== normalizeCalendarYmd(queryDateYmd)) {
    return slots;
  }
  const cutoff = wallClockMinutesFromMidnightInTimeZone(now, timeZone);
  return slots.filter((s) => hhmmToMinutes(s.startTime) >= cutoff);
}

/** Refuse une réservation sur un créneau déjà « passé » (même règle que le listing). */
export function assertBookableNotInPastWallTime(
  dateYmd: string,
  startTime: string,
  now: Date,
  timeZone: string,
): void {
  if (calendarDateYmdInTimeZone(now, timeZone) !== normalizeCalendarYmd(dateYmd)) {
    return;
  }
  const cutoff = wallClockMinutesFromMidnightInTimeZone(now, timeZone);
  if (hhmmToMinutes(startTime) < cutoff) {
    throw new BadRequestError(
      'SLOT_IN_PAST',
      'Ce créneau n’est plus disponible (heure déjà dépassée).',
    );
  }
}
