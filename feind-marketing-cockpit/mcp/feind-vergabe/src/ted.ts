// TED API v3 (api.ted.europa.eu): anonyme Suche, Expertensuche-Syntax.
import { Notice, httpGet, isoDay, regionFromNuts, scrub, uniq, noteStatus } from './common.js';

const SEARCH_URL = 'https://api.ted.europa.eu/v3/notices/search';
const FIELDS = ['publication-number', 'notice-title', 'buyer-name', 'classification-cpv', 'place-of-performance',
  'deadline-receipt-tender-date-lot', 'deadline-receipt-request-date-lot', 'publication-date', 'notice-type'];

export interface TedQuery {
  cpv: string[];
  country: string;          // ISO-3, z. B. DEU
  nuts: string[];           // optional, z. B. DE4 (Brandenburg); leer = ganzes Land
  publishedFrom: string;    // JJJJ-MM-TT
  publishedTo?: string;
  onlyOpen: boolean;        // nur Fristen ab heute
  onlyCompetition?: boolean; // nur laufende Wettbewerbe (form-type competition), keine Vergabeergebnisse
  keywords: string[];       // zusätzlicher Titel-Filter (clientseitig), leer = aus
  limit: number;
  iterationToken?: string;
}

const ymd = (d: string) => d.replace(/-/g, '');

export function buildTedQuery(q: Pick<TedQuery, 'cpv' | 'country' | 'nuts' | 'publishedFrom' | 'publishedTo' | 'onlyCompetition'>): string {
  const parts: string[] = [];
  if (q.onlyCompetition !== false) parts.push('form-type IN (competition)');
  if (q.cpv.length) parts.push(`classification-cpv IN (${q.cpv.join(' ')})`);
  parts.push(q.nuts.length ? `place-of-performance IN (${q.nuts.join(' ')})` : `place-of-performance IN (${q.country})`);
  parts.push(`publication-date>=${ymd(q.publishedFrom)}`);
  if (q.publishedTo) parts.push(`publication-date<=${ymd(q.publishedTo)}`);
  return parts.join(' AND ');
}

type Lang = Record<string, string | string[]>;
const pickLang = (v: unknown): string => {
  if (typeof v === 'string') return v;
  if (v && typeof v === 'object') {
    const o = v as Lang;
    const x = o.deu ?? o.eng ?? Object.values(o)[0];
    return Array.isArray(x) ? x[0] ?? '' : (x ?? '');
  }
  return '';
};

export function normalizeTed(n: Record<string, unknown>): Notice {
  const id = String(n['publication-number'] ?? '');
  const nuts = uniq(((n['place-of-performance'] as string[]) ?? []).filter(x => x !== 'DEU'));
  const raw = ((n['deadline-receipt-tender-date-lot'] as string[]) ?? []).concat((n['deadline-receipt-request-date-lot'] as string[]) ?? []);
  const deadlines = raw.map(isoDay).filter((x): x is string => !!x).sort();
  // Titel ohne vorangestelltes „Deutschland – <Kategorie> – “; Gedankenstriche im eigentlichen Titel bleiben erhalten.
  const full = pickLang(n['notice-title']);
  const parts = full.split(' – ');
  const title = parts.length > 2 && /^(Deutschland|Germany)$/i.test(parts[0].trim()) ? parts.slice(2).join(' – ') : full;
  return {
    source: 'ted', noticeId: id, title: scrub(title),
    authority: scrub(pickLang(n['buyer-name'])).slice(0, 200),
    cpv: uniq((n['classification-cpv'] as string[]) ?? []),
    nuts, region: regionFromNuts(nuts),
    deadline: deadlines[0] ?? null,
    publishedAt: isoDay(n['publication-date']),
    url: `https://ted.europa.eu/de/notice/-/detail/${id}`,
    noticeType: String(n['notice-type'] ?? '')
  };
}

export function applyFilters(list: Notice[], today: string, onlyOpen: boolean, keywords: string[]): Notice[] {
  const kw = keywords.map(k => k.toLowerCase());
  return list.filter(n => (!onlyOpen || !n.deadline || n.deadline >= today) && (!kw.length || kw.some(k => n.title.toLowerCase().includes(k))));
}

export async function searchTed(q: TedQuery, today: string): Promise<{ notices: Notice[]; total: number; nextToken: string | null; query: string; filteredOut: number }> {
  const query = buildTedQuery(q);
  const body: Record<string, unknown> = { query, fields: FIELDS, limit: q.limit, paginationMode: 'ITERATION' };
  if (q.iterationToken) body.iterationNextToken = q.iterationToken;
  const r = await httpGet(SEARCH_URL, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  if (r.status === 429) { noteStatus('ted', false, 429, 'Fair-Usage-Grenze erreicht'); throw new Error('TED meldet zu viele Anfragen (429). Einige Minuten warten, dann erneut suchen.'); }
  if (r.status >= 400) { noteStatus('ted', false, r.status, r.text.slice(0, 200)); throw new Error(`TED-Suche abgelehnt (HTTP ${r.status}). Abfrage prüfen: ${query}. Antwort: ${r.text.slice(0, 300)}`); }
  // TED liefert auch auf der letzten Seite einen Token; eine Folgeabfrage beginnt dann wieder bei Seite 1.
  const data = JSON.parse(r.text) as { notices?: Record<string, unknown>[]; totalNoticeCount?: number; iterationNextToken?: string | null };
  const all = (data.notices ?? []).map(normalizeTed);
  const notices = applyFilters(all, today, q.onlyOpen, q.keywords);
  noteStatus('ted', true, r.status, `${all.length} geladen, ${notices.length} nach Filter`);
  return { notices, total: data.totalNoticeCount ?? all.length, nextToken: all.length >= q.limit ? (data.iterationNextToken ?? null) : null, query, filteredOut: all.length - notices.length };
}

export async function getTedNotice(publicationNumber: string): Promise<Notice | null> {
  if (!/^\d{1,8}-\d{4}$/.test(publicationNumber)) throw new Error('Ungültige TED-Nummer. Format: 600374-2026.');
  const r = await httpGet(SEARCH_URL, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query: `publication-number=${publicationNumber}`, fields: FIELDS, limit: 1 }) });
  if (r.status >= 400) throw new Error(`TED-Abruf abgelehnt (HTTP ${r.status}).`);
  const d = JSON.parse(r.text) as { notices?: Record<string, unknown>[] };
  return d.notices?.[0] ? normalizeTed(d.notices[0]) : null;
}
