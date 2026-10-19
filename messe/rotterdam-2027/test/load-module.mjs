// Lädt ein einzelnes UMD-Modul („/* ---- name.js ---- */“) aus der gebündelten Cockpit-Seite,
// damit die Tests genau den Code prüfen, der im Artefakt läuft.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Führend ist seit 14.10.2026 „Feind Cockpit“ (TfuzbG) = cockpit-a1/Feind-Cockpit-A1.html; v3 ist Archiv.
export const PAGE = fileURLToPath(new URL('../../../cockpit-a1/Feind-Cockpit-A1.html', import.meta.url));

export function loadModule(name) {
  const html = readFileSync(PAGE, 'utf8');
  const marker = `/* ---- ${name} ---- */`;
  const start = html.indexOf(marker);
  if (start < 0) throw new Error(`Modul ${name} nicht gefunden`);
  const rest = html.slice(start + marker.length);
  const next = rest.search(/\/\* ---- [a-z0-9.-]+ ---- \*\/|<\/script>/);
  const src = next < 0 ? rest : rest.slice(0, next);
  const module = { exports: {} };
  // Gleicher Realm wie die Tests, sonst scheitert deepEqual an fremden Array-Prototypen.
  new Function('module', 'exports', 'globalThis', src)(module, module.exports, {});
  return module.exports;
}
