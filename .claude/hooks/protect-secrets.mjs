#!/usr/bin/env node
// PreToolUse-Hook: setzt die Datenschutzregeln aus CLAUDE.md technisch durch.
// Blockiert (Exit 2) Schreibzugriffe auf Dateien mit Zugangsdaten und `git add -f`.
import { fileURLToPath } from 'node:url';

const SECRET_FILE = [
  /(^|\/)\.env(\.(?!example$)[^/]+)?$/i, // .env, .env.local – nicht .env.example
  /(^|\/)credentials\//i,
  /credential/i,
  /client_secret/i,
  /service[-_]?account/i,
  /\.(pem|key|p12|pfx)$/i,
];

// `git add` mit -f / --force, auch kombiniert wie -Af
const FORCE_ADD = /\bgit\s+add\b[^;&|]*\s(--force\b|-[A-Za-z]*f[A-Za-z]*\b)/;

export function check({ tool_name, tool_input = {} }) {
  const path = (tool_input.file_path || tool_input.notebook_path || '').replace(/\\/g, '/');
  if (['Edit', 'Write', 'NotebookEdit', 'MultiEdit'].includes(tool_name) && path) {
    if (SECRET_FILE.some((re) => re.test(path))) {
      return `Gesperrt: "${path}" sieht nach Zugangsdaten aus. Zugangsdaten gehören nicht in Dateien, die Claude schreibt (CLAUDE.md, Datenschutz).`;
    }
  }
  // Text in Anführungszeichen (z. B. Commit-Nachrichten) ist kein Befehl
  const cmd = (tool_input.command || '').replace(/"(?:\\.|[^"\\])*"|'[^']*'/g, '""');
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
      process.exit(0); // unlesbare Eingabe: nicht blockieren, Claude Code meldet Hook-Fehler selbst
    }
    if (msg) {
      process.stderr.write(msg + '\n');
      process.exit(2);
    }
  });
}
