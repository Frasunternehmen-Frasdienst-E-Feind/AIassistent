#!/usr/bin/env node
// Erzeugt den Theme-Block (hell + dunkel) aus branding/feind-ci.tokens.json.
// Aufruf: node .claude/skills/feind-brand/scripts/tokens-to-css.mjs [pfad/zur/tokens.json]
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const defaultTokens = path.resolve(here, "../../../../branding/feind-ci.tokens.json");

export function tokensToCss(ci) {
  const vars = (set, indent) =>
    Object.entries(set).map(([k, v]) => `${indent}--${k}: ${v};`).join("\n");
  const shared = [
    `  --font-display: ${ci.typography.display};`,
    `  --font-sans: ${ci.typography.sans};`,
    `  --radius: ${ci.radius.default};`,
    `  --radius-input: ${ci.radius.input};`,
    `  --radius-button: ${ci.radius.button};`,
    ...ci.spacing.map((v, i) => `  --space-${i + 1}: ${v};`),
  ].join("\n");
  return [
    `:root {\n  color-scheme: light;\n${vars(ci.tokens.light, "  ")}\n${shared}\n}`,
    `@media (prefers-color-scheme: dark) {\n  :root:not([data-theme="light"]) {\n    color-scheme: dark;\n${vars(ci.tokens.dark, "    ")}\n  }\n}`,
    `:root[data-theme="dark"] {\n  color-scheme: dark;\n${vars(ci.tokens.dark, "  ")}\n}`,
    `body { background: var(--surface); color: var(--ink); font-family: var(--font-sans); }`,
  ].join("\n\n") + "\n";
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const file = process.argv[2] ?? defaultTokens;
  process.stdout.write(tokensToCss(JSON.parse(readFileSync(file, "utf8"))));
}
