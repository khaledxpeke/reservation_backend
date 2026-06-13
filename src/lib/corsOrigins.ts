import { env } from '../config';

function normalizeOrigin(value: string): string {
  return value.trim().replace(/\/$/, '');
}

function parseOriginList(raw: string): string[] {
  return raw
    .split(',')
    .map(normalizeOrigin)
    .filter(Boolean);
}

/** Wildcard host patterns, e.g. `https://*.vercel.app` */
function matchWildcardOrigin(pattern: string, origin: string): boolean {
  if (!pattern.includes('*')) return false;
  try {
    const placeholder = '__wildcard__';
    const patternUrl = new URL(pattern.replace(/\*/g, placeholder));
    const originUrl = new URL(origin);
    if (patternUrl.protocol !== originUrl.protocol) return false;
    if (patternUrl.port !== originUrl.port) return false;

    const hostPattern = patternUrl.hostname.replace(
      new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
      '*',
    );
    const hostRegex = new RegExp(
      `^${hostPattern.replace(/\./g, '\\.').replace(/\*/g, '[^.]+')}$`,
    );
    return hostRegex.test(originUrl.hostname);
  } catch {
    return false;
  }
}

/** All allowed browser origins (exact + wildcard patterns from env). */
export function getAllowedOrigins(): string[] {
  const fromList = parseOriginList(env.CORS_ORIGINS);
  const fromFrontend = env.FRONTEND_URL ? [normalizeOrigin(env.FRONTEND_URL)] : [];
  return [...new Set([...fromList, ...fromFrontend])];
}

export function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return true;
  const normalized = normalizeOrigin(origin);
  const allowed = getAllowedOrigins();

  if (allowed.includes(normalized)) return true;

  return allowed.some((pattern) => matchWildcardOrigin(pattern, normalized));
}

export function corsOriginCallback(
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean) => void,
): void {
  if (isOriginAllowed(origin)) {
    callback(null, true);
    return;
  }
  callback(new Error(`CORS: origin '${origin ?? '(none)'}' not allowed`));
}
