// Tool-Registrierung. Alle Tools lesen nur; ins Cockpit schreibt allein Claude nach Freigabe durch David.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { searchTed, getTedNotice } from './ted.js';
import { fetchBund } from './bund.js';
import { prepareTenders } from './prepare.js';
import { applyFilters } from './ted.js';
import { status, Notice } from './common.js';

// Arbeitsstand aus skills/tender-monitoring/SKILL.md (vom Vertrieb noch zu bestätigen)
export const DEFAULT_CPV = ['45233000', '45233220', '45233223', '45233200', '45233140', '45111300'];
export const DEFAULT_KEYWORDS = ['fräs', 'asphalt', 'fahrbahn', 'deckschicht', 'straßenbau', 'strassenbau', 'straßenbelag', 'deckenerneuerung', 'grinding', 'griffigkeit'];
const today = () => new Date().toISOString().slice(0, 10);
const daysAgo = (n: number) => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);
const RO = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true };

const noticeShape = z.object({ source: z.enum(['ted', 'bund']), noticeId: z.string(), title: z.string(), authority: z.string(), cpv: z.array(z.string()),
  nuts: z.array(z.string()), region: z.string(), deadline: z.string().nullable(), publishedAt: z.string().nullable(), url: z.string(), noticeType: z.string() });

function md(list: Notice[]): string {
  if (!list.length) return 'Keine Treffer.';
  return list.map(n => `- ${n.deadline ?? 'Frist offen'} · ${n.title} · ${n.authority || 'Vergabestelle ?'} · ${n.region || 'Region ?'} · ${n.url}`).join('\n');
}
const err = (e: unknown) => ({ isError: true, content: [{ type: 'text' as const, text: 'Fehler: ' + (e as Error).message }] });

export function createServer(): McpServer {
  const server = new McpServer({ name: 'feind-vergabe-mcp', version: '0.1.0' });

  server.registerTool('vergabe_search_ted', {
    title: 'TED-Ausschreibungen suchen',
    description: `Sucht Bekanntmachungen in der EU-Datenbank TED (API v3, anonym) nach CPV-Codes, Land/NUTS-Region und Veröffentlichungszeitraum.
Standard: CPV-Arbeitsliste Fräs-/Straßenbau, ganz Deutschland, letzte 14 Tage, nur offene Fristen. Gibt Metadaten zurück (keine Vergabeunterlagen, keine Personendaten).
Nutzen für: "neue Ausschreibungen Fräsen", "TED-Suche Brandenburg (NUTS DE4)". Für eine einzelne Nummer: vergabe_get_notice.`,
    inputSchema: {
      cpv: z.array(z.string().regex(/^\d{8}$/)).default(DEFAULT_CPV).describe('CPV-Codes (8-stellig), z. B. ["45233220"]'),
      nuts: z.array(z.string().regex(/^DE[0-9A-G][0-9A-Z]{0,2}$/)).default([]).describe('Optional NUTS-Codes, z. B. ["DE4","DE8"] für BB/MV; leer = ganz Deutschland'),
      publishedFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('Veröffentlicht ab (JJJJ-MM-TT), Standard: vor 14 Tagen'),
      publishedTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      onlyOpen: z.boolean().default(true).describe('Nur Bekanntmachungen mit Frist ab heute'),
      onlyCompetition: z.boolean().default(true).describe('Nur laufende Ausschreibungen; false zeigt auch Vergabeergebnisse und Auftragsänderungen'),
      keywords: z.array(z.string()).default([]).describe('Optionaler Titel-Filter, z. B. ["fräs","asphalt"]'),
      limit: z.number().int().min(1).max(100).default(50),
      iterationToken: z.string().optional().describe('nextToken aus der vorigen Antwort für die nächste Seite')
    },
    outputSchema: { total: z.number(), count: z.number(), filteredOut: z.number(), nextToken: z.string().nullable(), query: z.string(), notices: z.array(noticeShape) },
    annotations: RO
  }, async (p) => {
    try {
      const r = await searchTed({ cpv: p.cpv, country: 'DEU', nuts: p.nuts, publishedFrom: p.publishedFrom ?? daysAgo(14), publishedTo: p.publishedTo, onlyOpen: p.onlyOpen, onlyCompetition: p.onlyCompetition, keywords: p.keywords, limit: p.limit, iterationToken: p.iterationToken }, today());
      const out = { total: r.total, count: r.notices.length, filteredOut: r.filteredOut, nextToken: r.nextToken, query: r.query, notices: r.notices };
      return { content: [{ type: 'text', text: `TED: ${r.notices.length} Treffer (von ${r.total} gesamt, ${r.filteredOut} herausgefiltert)${r.nextToken ? ', weitere Seiten vorhanden' : ''}.\n${md(r.notices)}` }], structuredContent: out };
    } catch (e) { return err(e); }
  });

  server.registerTool('vergabe_fetch_bund', {
    title: 'service.bund.de-Ausschreibungen lesen',
    description: `Liest den öffentlichen RSS-Feed von service.bund.de (Bund, Länder, Kommunen; nur die neuesten Einträge, ohne CPV-Codes) und filtert nach Stichworten im Titel.
Standard-Stichworte: fräs, asphalt, fahrbahn, deckschicht, straßenbau, straßenbelag, deckenerneuerung, grinding, griffigkeit. keywords=[] liefert alle Einträge.`,
    inputSchema: {
      keywords: z.array(z.string()).default(DEFAULT_KEYWORDS).describe('Titel-Stichworte (klein, Teilwort genügt)'),
      onlyOpen: z.boolean().default(true)
    },
    outputSchema: { feedCount: z.number(), count: z.number(), notices: z.array(noticeShape) },
    annotations: RO
  }, async (p) => {
    try {
      const all = await fetchBund();
      const notices = applyFilters(all, today(), p.onlyOpen, p.keywords);
      return { content: [{ type: 'text', text: `service.bund.de: ${notices.length} passende von ${all.length} Einträgen im Feed.\n${md(notices)}` }], structuredContent: { feedCount: all.length, count: notices.length, notices } };
    } catch (e) { return err(e); }
  });

  server.registerTool('vergabe_get_notice', {
    title: 'Einzelne TED-Bekanntmachung',
    description: 'Holt eine TED-Bekanntmachung per Veröffentlichungsnummer (Format 600374-2026) mit Frist, Vergabestelle, CPV, Region und Link.',
    inputSchema: { publicationNumber: z.string().describe('TED-Nummer, z. B. 600374-2026') },
    outputSchema: { found: z.boolean(), notice: noticeShape.nullable() },
    annotations: RO
  }, async (p) => {
    try {
      const n = await getTedNotice(p.publicationNumber);
      return { content: [{ type: 'text', text: n ? md([n]) : `Keine Bekanntmachung ${p.publicationNumber} gefunden.` }], structuredContent: { found: !!n, notice: n } };
    } catch (e) { return err(e); }
  });

  server.registerTool('vergabe_prepare_tenders', {
    title: 'Treffer fürs Cockpit vorbereiten',
    description: `Wandelt Treffer (notices aus den Such-Tools) in Entwürfe für tenders/<id> um und trennt neu / aktualisiert (geänderte Frist) / Dublette.
existing: vorher mit ArtifactData list tenders geholte {id,url,deadline,title,status} – deadline immer mitgeben (auch null), sonst wird keine Friständerung erkannt.
aktualisiert enthält nur {deadline,url,source} als update-Daten; Status und Eignung im Cockpit nicht überschreiben. Schreibt NICHTS – das Schreiben erfolgt erst nach Freigabe durch David per ArtifactData batch. fit bleibt "pruefen"; die Bewertung macht der Skill tender-monitoring.`,
    inputSchema: {
      notices: z.array(noticeShape),
      existing: z.array(z.object({ id: z.string(), url: z.string().optional(), deadline: z.string().nullable().optional(), title: z.string().optional(), status: z.string().optional() })).default([]).describe('Vorhandene tenders mit id, url, deadline, title, status'),
      cpvWatch: z.array(z.string()).default(DEFAULT_CPV),
      keywords: z.array(z.string()).default(DEFAULT_KEYWORDS)
    },
    annotations: { ...RO, openWorldHint: false }
  }, async (p) => {
    const r = prepareTenders(p.notices, p.existing, p.cpvWatch, p.keywords, today());
    return { content: [{ type: 'text', text: `Neu: ${r.neu.length} · Frist geändert: ${r.aktualisiert.length} · Dubletten: ${r.dubletten.length}\n` + JSON.stringify(r, null, 1) }], structuredContent: r as unknown as Record<string, unknown> };
  });

  server.registerTool('vergabe_source_status', {
    title: 'Quellenstatus',
    description: 'Zeigt je Quelle (ted, bund) den letzten Abruf in dieser Sitzung: Erfolg, HTTP-Status, Hinweis. Ohne vorherigen Abruf: "noch nicht abgefragt".',
    inputSchema: {},
    annotations: { ...RO, openWorldHint: false }
  }, async () => {
    const rows = ['ted', 'bund'].map(k => ({ quelle: k, ...(status.get(k) ?? { ok: null, at: null, httpStatus: null, hinweis: 'noch nicht abgefragt' }) }));
    return { content: [{ type: 'text', text: rows.map(r => `${r.quelle}: ${r.ok === null ? '–' : r.ok ? 'ok' : 'Fehler'} · ${r.hinweis}${r.at ? ' · ' + r.at : ''}`).join('\n') }], structuredContent: { quellen: rows } };
  });

  return server;
}
