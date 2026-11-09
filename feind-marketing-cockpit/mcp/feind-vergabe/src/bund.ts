// service.bund.de: RSS-Feed der Ausschreibungen (ohne Registrierung). Enthält keine CPV-Codes.
import { Notice, httpGet, isoDay, scrub, noteStatus } from './common.js';

export const BUND_FEED = 'https://www.service.bund.de/Content/Globals/Functions/RSSFeed/RSSGenerator_Ausschreibungen.xml';
const ENT: Record<string, string> = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&auml;': 'ä', '&ouml;': 'ö', '&uuml;': 'ü', '&Auml;': 'Ä', '&Ouml;': 'Ö', '&Uuml;': 'Ü', '&szlig;': 'ß', '&nbsp;': ' ' };
const decode = (s: string) => s.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&[a-zA-Z]+;/g, e => ENT[e] ?? e);
const tag = (xml: string, t: string) => { const m = new RegExp(`<${t}>([\\s\\S]*?)</${t}>`).exec(xml); return m ? m[1].replace(/^\s*<!\[CDATA\[|\]\]>\s*$/g, '').trim() : ''; };
const field = (desc: string, label: string) => { const m = new RegExp(label + ':\\s*(?:<strong>([^<]*)</strong>)?').exec(desc); return m && m[1] ? decode(m[1]).trim() : ''; };

export function parseBundRss(xml: string): Notice[] {
  const items = xml.split('<item>').slice(1).map(x => x.split('</item>')[0]);
  return items.map(it => {
    const desc = tag(it, 'description');
    const link = decode(tag(it, 'link')).replace(/#.*$/, '');
    const guid = decode(tag(it, 'guid')) || link;
    const id = (/\/(\d+)\.html/.exec(guid) || [])[1] || guid;
    return {
      source: 'bund' as const, noticeId: id, title: scrub(decode(tag(it, 'title'))),
      authority: scrub(field(desc, 'Vergabestelle')).slice(0, 200), cpv: [], nuts: [],
      region: scrub(field(desc, 'Erf(?:&uuml;|ü)llungsort')),
      deadline: isoDay(field(desc, 'Angebotsfrist')), publishedAt: pubDay(tag(it, 'pubDate')),
      url: link, noticeType: 'ausschreibung'
    };
  });
}
function pubDay(rfc: string): string | null {
  const d = new Date(rfc);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

export async function fetchBund(): Promise<Notice[]> {
  const r = await httpGet(BUND_FEED);
  if (r.status >= 400) { noteStatus('bund', false, r.status); throw new Error(`service.bund.de antwortet mit HTTP ${r.status}. Später erneut versuchen.`); }
  const list = parseBundRss(r.text);
  noteStatus('bund', true, r.status, `${list.length} Einträge im Feed (nur die neuesten; kein Anspruch auf Vollständigkeit)`);
  return list;
}
