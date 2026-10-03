// Treffer ins Cockpit-Format tenders/<id> bringen und Dubletten erkennen. Rechnet nur, schreibt nichts.
import { Notice } from './common.js';

export interface TenderDraft {
  id: string;
  data: { title: string; authority: string; cpv: string[]; region: string; deadline: string | null; portal: string; url: string;
    fit: 'pruefen'; fitReason: string; status: 'neu'; foundAt: string; source: string };
  matchInfo: string;
}
export interface Existing { id: string; url?: string; deadline?: string | null; title?: string; status?: string }

export const tenderId = (n: Notice) => (n.source === 'ted' ? 'ted-' : 'bund-') + n.noticeId.toLowerCase().replace(/[^a-z0-9-]+/g, '-');
const normUrl = (u = '') => u.replace(/#.*$/, '').replace(/\/+$/, '').toLowerCase();
// Schlüssel unabhängig von Sprache/Pfad: TED-Nummer bzw. service.bund.de-Nummer
export function noticeKey(url = ''): string | null {
  const ted = /ted\.europa\.eu\/.*?(\d{1,8}-\d{4})(?:[/?#]|$)/.exec(url);
  if (ted) return 'ted:' + ted[1];
  const bund = /service\.bund\.de\/.*\/([0-9A-Za-z]+)\.html/.exec(url);
  return bund ? 'bund:' + bund[1].toLowerCase() : null;
}
const normTitle = (t = '') => t.toLowerCase().replace(/[^a-z0-9äöüß]+/g, ' ').trim();
const words = (t = '') => new Set(normTitle(t).split(' ').filter(w => w.length > 3));
const nums = (t = '') => normTitle(t).split(' ').filter(w => /\d/.test(w)).sort().join(' ');
// Titel gelten als gleich, wenn Nummern (Los, Paket, Straße) übereinstimmen und der kürzere
// zu mindestens 80 % im längeren steckt (mind. 3 Wörter).
export function similarTitle(a = '', b = ''): boolean {
  if (nums(a) !== nums(b)) return false;
  const A = words(a), B = words(b);
  const min = Math.min(A.size, B.size);
  if (min < 3) return false;
  let hit = 0; for (const w of A) if (B.has(w)) hit++;
  return hit / min >= 0.8;
}
const numOf = (id: string) => { const m = /(\d+)-(\d{4})/.exec(id); return m ? Number(m[2]) * 1e8 + Number(m[1]) : 0; };

export function prepareTenders(notices: Notice[], existing: Existing[], cpvWatch: string[], keywords: string[], today: string) {
  const byId = new Map(existing.map(e => [e.id, e]));
  const byUrl = new Map(existing.filter(e => e.url).map(e => [normUrl(e.url), e]));
  const byKey = new Map(existing.map(e => [noticeKey(e.url), e] as const).filter(([k]) => !!k));
  const titled = existing.filter(e => e.title);
  const neu: TenderDraft[] = [], aktualisiert: TenderDraft[] = [], dubletten: { id: string; grund: string; notice?: string }[] = [];
  const seen = new Set<string>();
  for (const n of notices) {
    const id = tenderId(n);
    if (seen.has(id)) { dubletten.push({ id, grund: 'doppelt in dieser Abfrage' }); continue; }
    seen.add(id);
    const cpvHit = n.cpv.filter(c => cpvWatch.some(w => c.startsWith(w.replace(/0+$/, ''))));
    const kwHit = keywords.filter(k => n.title.toLowerCase().includes(k.toLowerCase()));
    const matchInfo = [cpvHit.length ? 'CPV ' + cpvHit.join(', ') : n.cpv.length ? 'kein CPV-Treffer' : 'CPV nicht im Feed', kwHit.length ? 'Stichwort ' + kwHit.join(', ') : ''].filter(Boolean).join(' · ');
    const draft: TenderDraft = { id, matchInfo, data: {
      title: n.title, authority: n.authority, cpv: n.cpv, region: n.region, deadline: n.deadline,
      portal: n.source === 'ted' ? 'TED' : 'service.bund.de', url: n.url, fit: 'pruefen',
      fitReason: 'Automatisch gefunden (' + matchInfo + '); Eignung durch tender-monitoring prüfen.',
      status: 'neu', foundAt: today, source: (n.source === 'ted' ? 'TED-API v3 ' : 'service.bund.de RSS ') + today } };
    const hit = byId.get(id) ?? byKey.get(noticeKey(n.url)) ?? byUrl.get(normUrl(n.url));
    const sameTitle = !hit ? titled.find(e => similarTitle(e.title, n.title)) : undefined;
    if (sameTitle) { dubletten.push({ id: sameTitle.id, notice: id, grund: 'gleicher Titel wie vorhandener Eintrag' + (sameTitle.status ? ' (Status ' + sameTitle.status + ')' : '') + ', vermutlich Änderungsbekanntmachung' }); continue; }
    if (!hit) neu.push(draft);
    else if ((hit.deadline ?? null) !== n.deadline && n.deadline) aktualisiert.push({ ...draft, id: hit.id });
    else dubletten.push({ id: hit.id, notice: id, grund: 'bereits im Cockpit' + (hit.status ? ' (Status ' + hit.status + ')' : '') });
  }
  // Mehrere Bekanntmachungen derselben Vergabe (Änderung, Berichtigung): nur die jüngste behalten.
  const group = new Map<string, TenderDraft>();
  for (const d of neu) {
    const k = normTitle(d.data.title) + '|' + normTitle(d.data.authority).slice(0, 60);
    const prev = group.get(k);
    if (!prev) { group.set(k, d); continue; }
    const [keep, drop] = numOf(d.id) > numOf(prev.id) ? [d, prev] : [prev, d];
    group.set(k, keep);
    dubletten.push({ id: keep.id, notice: drop.id, grund: 'frühere Bekanntmachung derselben Vergabe' });
  }
  return { neu: [...group.values()], aktualisiert, dubletten };
}
