#!/usr/bin/env node
/**
 * Migration Feind Cockpit – ersetzt das Firebase-Skript aus Kap. 9 (migrate-leads.js).
 *
 * Warum: Der Artefakt-Speicher (claude.use('db')) ist kein Firestore – es gibt keinen
 * Service-Account. Dieses Werkzeug arbeitet deshalb OFFLINE auf JSON-Exporten und erzeugt
 * einen prüfbaren Schreibplan. Ausgeführt wird der Plan entweder
 *   a) im Cockpit selbst (Admin → Migration, nur Editor/Owner) oder
 *   b) von Claude über das ArtifactData-Werkzeug (batch, ≤ 50 Schreibvorgänge je Paket).
 * Die Regeln stehen in FeindCore.planMigration (eine Quelle mit der Seite):
 * nie löschen, nie Vorhandenes überschreiben, idempotent.
 *
 * Aufruf:
 *   node cockpit/tools/migrate.mjs --target backup.json [--a2 a2.json] [--a3 a3.json] [--out plan.json]
 * Eingabeformate je Datei (automatisch erkannt):
 *   - Cockpit-Backup:  { collections: { <col>: [ {_id, ...} ] } }
 *   - Einfaches Objekt: { <col>: [ {_id|id, ...} ] }
 *   - Ordner im ArtifactData-out_dir-Layout: <dir>/<col>/<id>.json
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export function loadCore(htmlPath = path.join(here, '..', 'Feind-Cockpit.html')) {
  const html = fs.readFileSync(htmlPath, 'utf8');
  const m = /<script id="feind-core">([\s\S]*?)<\/script>/.exec(html);
  if (!m) throw new Error('Kernblock <script id="feind-core"> nicht gefunden');
  const ctx = { module: { exports: {} }, TextEncoder, console };
  vm.createContext(ctx);
  vm.runInContext(m[1], ctx, { filename: 'feind-core.js' });
  return ctx.module.exports;
}

function readDocsFromDir(dir) {
  const out = {};
  for (const col of fs.readdirSync(dir)) {
    const p = path.join(dir, col);
    if (!fs.statSync(p).isDirectory()) continue;
    out[col] = fs.readdirSync(p).filter(f => f.endsWith('.json')).map(f => {
      const raw = JSON.parse(fs.readFileSync(path.join(p, f), 'utf8'));
      const id = path.basename(f, '.json');
      const body = raw && typeof raw === 'object' && raw.data && typeof raw.data === 'object' ? raw.data : raw;
      return Object.assign({}, body, { _id: id });
    });
  }
  return out;
}
export function readSnapshot(p) {
  if (!p) return {};
  if (fs.statSync(p).isDirectory()) return readDocsFromDir(p);
  const j = JSON.parse(fs.readFileSync(p, 'utf8'));
  const cols = j.collections && typeof j.collections === 'object' ? j.collections : j;
  const out = {};
  for (const [c, list] of Object.entries(cols)) if (Array.isArray(list)) out[c] = list.map(d => Object.assign({}, d, { _id: d._id != null ? d._id : d.id }));
  return out;
}

function main(argv) {
  const args = {}; for (let i = 0; i < argv.length; i += 2) args[argv[i].replace(/^--/, '')] = argv[i + 1];
  if (!args.target) { console.error('Aufruf: node cockpit/tools/migrate.mjs --target <backup.json|ordner> [--a2 …] [--a3 …] [--out plan.json]'); process.exit(2); }
  const C = loadCore();
  const plan = C.planMigration({ target: readSnapshot(args.target), sources: { a2: readSnapshot(args.a2), a3: readSnapshot(args.a3) } });
  console.log('▶ Migrationsplan Feind Cockpit');
  plan.report.forEach(r => console.log('  · ' + r));
  plan.conflicts.forEach(c => console.log('  ⚠ ' + c));
  console.log(`= ${plan.ops.length} Schreibvorgänge, ${plan.conflicts.length} Konflikte, 0 Löschungen`);
  if (args.out) {
    const batches = C.chunk(plan.ops, 50).map(b => b.map(o => ({ op: o.op, collection: o.collection, doc_id: o.doc_id, data: o.data })));
    fs.writeFileSync(args.out, JSON.stringify({ createdAt: new Date().toISOString(), report: plan.report, conflicts: plan.conflicts, batches }, null, 2));
    console.log('→ Plan gespeichert: ' + args.out + ' (' + batches.length + ' Pakete für ArtifactData batch)');
  }
  return plan;
}
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) main(process.argv.slice(2));
