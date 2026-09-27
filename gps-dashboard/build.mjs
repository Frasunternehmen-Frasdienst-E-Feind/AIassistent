#!/usr/bin/env node
/*
 * build.mjs – erzeugt die verteilte, offline nutzbare Einzeldatei.
 *
 *   node build.mjs
 *
 * Liest gps-dashboard.src.html und ersetzt die mit <!-- BUILD:CSS/JS <pfad> -->
 * markierten <link>/<script src>-Tags durch inline <style>/<script>-Blöcke aus
 * dem vendor/-Ordner. Ergebnis: gps-dashboard.html (keine externen Dateien nötig;
 * lediglich die OSM-Kartenkacheln benötigen weiterhin Internet).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const SRC = join(here, 'gps-dashboard.src.html');
const OUT = join(here, 'gps-dashboard.html');

let html = readFileSync(SRC, 'utf8');

// </script> bzw. </style> innerhalb der Bibliothek maskieren, damit der Inline-Block
// nicht vorzeitig endet (in String-/Regex-Literalen ist <\/ … äquivalent).
const safeJs  = s => s.replace(/<\/script/gi, '<\\/script');
const safeCss = s => s.replace(/<\/style/gi, '<\\/style');

let count = 0;
// CSS
html = html.replace(/<!--\s*BUILD:CSS\s+(\S+)\s*-->\s*<link\b[^>]*>/gi, (_m, p) => {
  const css = readFileSync(join(here, p), 'utf8');
  count++;
  return `<style>/* inlined: ${p} */\n${safeCss(css)}\n</style>`;
});
// JS
html = html.replace(/<!--\s*BUILD:JS\s+(\S+)\s*-->\s*<script\b[^>]*><\/script>/gi, (_m, p) => {
  const js = readFileSync(join(here, p), 'utf8');
  count++;
  return `<script>/* inlined: ${p} */\n${safeJs(js)}\n</script>`;
});

writeFileSync(OUT, html);
const kb = (Buffer.byteLength(html, 'utf8') / 1024).toFixed(0);
console.log(`OK: ${count} Bibliotheken inline eingebettet -> ${OUT} (${kb} KB)`);
if (count === 0) {
  console.error('WARN: keine BUILD-Marker gefunden – wurde die Quelle geändert?');
  process.exit(1);
}
