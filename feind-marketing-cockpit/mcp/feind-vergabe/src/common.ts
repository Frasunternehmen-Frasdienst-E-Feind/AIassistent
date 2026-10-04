// Gemeinsame Bausteine: Normalformat, Datenschutz-Filter, Regionen (NUTS), HTTP mit Zeitlimit und Drosselung.

export interface Notice {
  source: 'ted' | 'bund';
  noticeId: string;
  title: string;
  authority: string;
  cpv: string[];
  nuts: string[];
  region: string;
  deadline: string | null;      // JJJJ-MM-TT oder null, wenn nicht angegeben
  publishedAt: string | null;   // JJJJ-MM-TT
  url: string;
  noticeType: string;
}

// Ausgehende Verbindungen nur zu diesen Hosts (keine Weiterleitung auf fremde Seiten).
export const ALLOWED_HOSTS = ['api.ted.europa.eu', 'ted.europa.eu', 'www.service.bund.de', 'service.bund.de'];

// Keine personenbezogenen Daten: E-Mail-Adressen und Telefonnummern werden entfernt.
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const PHONE = /(?:\+|00)\d{2}[\s\d/()-]{6,}\d|(?:Tel\.?|Telefon|Fax|Mobil)[:\s]*[\d+][\d\s/()-]{5,}\d/gi;
export function scrub(text: string): string {
  return text.replace(EMAIL, '[entfernt]').replace(PHONE, '[entfernt]').replace(/\s+/g, ' ').trim();
}

// NUTS-1-Codes Deutschland → Bundesland
export const NUTS_DE: Record<string, string> = {
  DE1: 'Baden-Württemberg', DE2: 'Bayern', DE3: 'Berlin', DE4: 'Brandenburg', DE5: 'Bremen', DE6: 'Hamburg',
  DE7: 'Hessen', DE8: 'Mecklenburg-Vorpommern', DE9: 'Niedersachsen', DEA: 'Nordrhein-Westfalen',
  DEB: 'Rheinland-Pfalz', DEC: 'Saarland', DED: 'Sachsen', DEE: 'Sachsen-Anhalt', DEF: 'Schleswig-Holstein', DEG: 'Thüringen'
};
export function regionFromNuts(nuts: string[]): string {
  const states = Array.from(new Set(nuts.filter(n => /^DE[0-9A-G]/.test(n)).map(n => NUTS_DE[n.slice(0, 3)]).filter(Boolean)));
  return states.join(', ');
}

export function isoDay(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  const de = /(\d{2})\.(\d{2})\.(\d{4})/.exec(v);
  return de ? `${de[3]}-${de[2]}-${de[1]}` : null;
}

export const uniq = <T>(a: T[]): T[] => Array.from(new Set(a));

// Einfache Drosselung je Host (TED Fair Usage: deutlich unter 600 Abrufen in 6 Minuten).
const lastCall = new Map<string, number>();
const MIN_GAP_MS = 700;

export interface FetchResult { status: number; text: string }
export async function httpGet(url: string, init: RequestInit = {}, timeoutMs = 20000): Promise<FetchResult> {
  const u = new URL(url);
  if (!ALLOWED_HOSTS.includes(u.hostname)) throw new Error(`Host ${u.hostname} ist nicht freigegeben. Erlaubt: ${ALLOWED_HOSTS.join(', ')}.`);
  // Zeitfenster sofort reservieren, damit parallele Aufrufe nacheinander starten.
  const slot = Math.max(Date.now(), (lastCall.get(u.hostname) ?? 0) + MIN_GAP_MS);
  lastCall.set(u.hostname, slot);
  const wait = slot - Date.now();
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, redirect: 'error', signal: ctl.signal, headers: { 'user-agent': 'feind-vergabe-mcp/0.1 (Marketing-Cockpit, nur lesend)', ...(init.headers ?? {}) } });
    return { status: res.status, text: await res.text() };
  } catch (e) {
    const cause = (e as { cause?: { code?: string; message?: string } }).cause;
    const msg = (e as Error).name === 'AbortError' ? `Zeitüberschreitung nach ${timeoutMs / 1000} s` : (e as Error).message + (cause ? ` (${cause.code ?? cause.message})` : '');
    noteStatus(u.hostname.includes('ted') ? 'ted' : 'bund', false, null, msg);
    throw new Error(`Abruf von ${u.hostname} fehlgeschlagen: ${msg}. Später erneut versuchen oder vergabe_source_status prüfen.`);
  } finally { clearTimeout(t); }
}

export const status = new Map<string, { ok: boolean; at: string; httpStatus: number | null; hinweis: string }>();
export function noteStatus(src: string, ok: boolean, httpStatus: number | null, hinweis = ''): void {
  status.set(src, { ok, at: new Date().toISOString(), httpStatus, hinweis });
}
