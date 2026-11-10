#!/usr/bin/env node
// PreToolUse-Hook: setzt die Datenschutzregeln aus CLAUDE.md technisch durch.
// Blockiert (Exit 2) Schreibzugriffe auf Dateien mit Zugangsdaten und `git add -f`.
// shortcut: prüft nur Edit/Write-Werkzeuge und git-Befehle, nicht Bash-Umleitungen (`> .env`, tee);
// ersetzt keinen Secret-Scan. Fehlt node oder ist die Eingabe unlesbar, blockiert er nicht.
import { fileURLToPath } from 'node:url';

const SECRET_FILE = [
  /(^|\/)\.env(\.(?!example$)[^/]+)?$/i, // .env, .env.local – nicht .env.example
  /(^|\/)credentials\//i,
  /credential/i,
  /client_secret/i,
  /service[-_]?account/i,
  /(^|\/)secrets?(\.[^/]+)?$/i, // secrets.json, secret.yaml – nicht protect-secrets.mjs
  /(^|\/)token\.json$/i, // OAuth-Token – nicht feind-ci.tokens.json
  /(^|\/)(id_rsa|id_ed25519)[^/]*$/i,
  /(^|\/)\.(npmrc|netrc|pypirc)$/i,
  /\.(pem|key|p12|pfx)$/i,
];

// `git [-C dir] add|stage` mit -f, --force (auch abgekürzt) oder kombiniert wie -Af
const FORCE_ADD =
  /\bgit\b[^;&|\n]*\s(add|stage)(?=\s|$)[^;&|\n]*\s["']?(--f(o(r(c(e)?)?)?)?|-[A-Za-z]*f[A-Za-z]*)\b/;
// Commit-Nachrichten (-m/-F) sind Text, kein Befehl
const MESSAGE_ARG = /(\s(?:-m|--message|-F|--file))(=|\s+)("(?:\\.|[^"\\])*"|'[^']*'|\S+)/g;

export function check({ tool_name, tool_input } = {}) {
  const input = tool_input || {};
  const path = String(input.file_path || input.notebook_path || '').replace(/\\/g, '/');
  if (['Edit', 'Write', 'NotebookEdit', 'MultiEdit'].includes(tool_name) && path) {
    if (SECRET_FILE.some((re) => re.test(path))) {
      return `Gesperrt: "${path}" sieht nach Zugangsdaten aus. Zugangsdaten gehören nicht in Dateien, die Claude schreibt (CLAUDE.md, Datenschutz).`;
    }
  }
  const cmd = String(input.command || '').replace(MESSAGE_ARG, '$1 ""');
  if (tool_name === 'Bash' && FORCE_ADD.test(cmd)) {
    return 'Gesperrt: `git add -f` umgeht .gitignore. JSON-Ausnahmen gehören in den kommentierten Ausnahmeblock der .gitignore (CLAUDE.md).';
  }
  return null;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  let raw = '';
  process.stdin.on('data', (c) => (raw += c));
  process.stdin.on('end', () => {
    let msg = null;
    try {
      msg = check(JSON.parse(raw || '{}'));
    } catch {
      process.exit(0); // unlesbare Eingabe: nicht blockieren, sonst wäre jede Sitzung lahmgelegt
    }
    if (msg) {
      process.stderr.write(msg + '\n');
      process.exit(2);
    }
  });
}
