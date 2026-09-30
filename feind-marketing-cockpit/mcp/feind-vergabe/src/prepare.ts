// Treffer ins Cockpit-Format tenders/<id> bringen und Dubletten erkennen. Rechnet nur, schreibt nichts.
import { Notice } from './common.js';

export interface TenderDraft {
  id: string;
  data: { title: string; authority: string; cpv: string[]; region: string; deadline: string | null; portal: string; url: string;
    fit: 'pruefen'; fitReason: string; status: 'neu'; foundAt: string; source: string };
  matchInfo: string;
}
export interface Existing { id: string; url?: string; deadline?: string | null }

export const tenderId = (n: Notice) => (n.source === 'ted' ? 'ted-' : 'bund-') + n.noticeId.toLowerCase().replace(/[^a-z0-9-]+/g, '-');
const normUrl = (u = '') => u.replace(/#.*$/, '').replace(/\/+$/, '').toLowerCase();

export function prepareTenders(notices: Notice[], existing: Existing[], cpvWatch: string[], keywords: string[], today: string) {
  const byId = new Map(existing.map(e => [e.id, e]));
  const byUrl = new Map(existing.filter(e => e.url).map(e => [normUrl(e.url), e]));
  const neu: TenderDraft[] = [], aktualisiert: TenderDraft[] = [], dubletten: { id: string; grund: string }[] = [];
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
    const hit = byId.get(id) ?? byUrl.get(normUrl(n.url));
    if (!hit) neu.push(draft);
    else if ((hit.deadline ?? null) !== n.deadline && n.deadline) aktualisiert.push({ ...draft, id: hit.id });
    else dubletten.push({ id: hit.id, grund: 'bereits im Cockpit' });
  }
  return { neu, aktualisiert, dubletten };
}
