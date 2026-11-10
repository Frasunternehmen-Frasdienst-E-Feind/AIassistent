import { test } from 'node:test';
import assert from 'node:assert/strict';
import { check } from './protect-secrets.mjs';

const write = (file_path) => check({ tool_name: 'Write', tool_input: { file_path } });
const bash = (command) => check({ tool_name: 'Bash', tool_input: { command } });

test('sperrt Dateien mit Zugangsdaten', () => {
  for (const p of ['.env', 'cron/.env.local', 'credentials/ga4.json', 'seo_reporting/service-account.json',
    'client_secret_123.json', 'C:\\Users\\x\\key.pem', 'gsc_credentials.yaml']) {
    assert.ok(write(p), p);
  }
});

test('lässt normale Dateien durch', () => {
  for (const p of ['.env.example', 'package.json', 'branding/feind-ci.tokens.json', 'docs/keyboard.md',
    'zeiterfassung/index.html']) {
    assert.equal(write(p), null, p);
  }
});

test('sperrt git add -f, erlaubt normales git add', () => {
  assert.ok(bash('git add -f secrets.json'));
  assert.ok(bash('git add --force data/x.json'));
  assert.ok(bash('git add -Af'));
  assert.equal(bash('git add -A && git commit -m "fix"'), null);
  assert.equal(bash('git add zeiterfassung/app.js'), null);
  assert.equal(bash('git commit -m "add -f flag doc"'), null);
  assert.equal(bash('git add a.js && git commit -m "verbietet git add -f"'), null);
  assert.ok(bash('git commit -m "x" && git add -f y.json'));
});
