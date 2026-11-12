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

// Befunde aus dem Review vom 10.11.2026
test('sperrt Umgehungen von git add -f', () => {
  for (const c of ['bash -c "git add -f x.json"', "sh -c 'git add --force x.json'", 'git add "-f" x',
    'git -C . add -f x.json', 'git -c k=v add -f x', 'git stage -f x', 'git add --forc x']) {
    assert.ok(bash(c), c);
  }
});

test('kein Fehlalarm bei mehrzeiligen Befehlen und Dateinamen mit "add"', () => {
  assert.equal(bash('git add a.js\nrm -rf tmp'), null);
  assert.equal(bash('git rm add.js -f'), null);
  assert.equal(bash("git commit -m 'git add -f ist verboten'"), null);
});

test('sperrt weitere Geheimnis-Dateien, nicht aber den Hook selbst', () => {
  for (const p of ['secrets.json', 'config/secret.yaml', 'token.json', '.npmrc', '.netrc', 'id_rsa']) {
    assert.ok(write(p), p);
  }
  for (const p of ['.claude/hooks/protect-secrets.mjs', 'branding/feind-ci.tokens.json']) {
    assert.equal(write(p), null, p);
  }
});

test('stürzt bei unerwarteter Eingabe nicht ab', () => {
  assert.equal(check({ tool_name: 'Bash', tool_input: null }), null);
  assert.equal(check({ tool_name: 'Write', tool_input: { file_path: 42 } }), null);
  assert.equal(check({}), null);
});

test('Git-Sicherheitsgurt sperrt schwer umkehrbare Befehle', () => {
  for (const c of ['git push --force origin main', 'git push -f', 'git push --force-with-lease -u origin x',
    'git push origin +main', 'git push origin --delete feature', 'git push origin :feature',
    'git reset --hard origin/main', 'git -C repo reset --hard', 'git branch -D alt', 'git branch -d alt',
    'git branch --delete alt', 'git clean -fd', 'cd repo && git push -f']) {
    assert.ok(bash(c), c);
  }
});

test('Git-Sicherheitsgurt lässt Alltagsbefehle durch', () => {
  for (const c of ['git push -u origin claude/x', 'git push origin HEAD:main', 'git reset HEAD~1',
    'git reset --soft HEAD~1', 'git branch', 'git branch -a', 'git branch --show-current',
    'git checkout -q -B x origin/main', 'git clean -n', 'git commit -m "reset --hard und push -f verboten"',
    'git merge --no-edit origin/x', 'git fetch origin main']) {
    assert.equal(bash(c), null, c);
  }
});

test('Git-Sicherheitsgurt sperrt das Verwerfen ungesicherter Änderungen', () => {
  for (const c of ['git checkout .', 'git checkout -- .', 'git -C repo checkout -- .', 'git checkout :/',
    'git checkout -f main', 'git checkout --force main', 'git restore .', 'git restore -- .',
    'git restore --worktree .', 'git restore -s HEAD :/', 'git stash drop', 'git stash drop stash@{1}',
    'git stash clear', 'cd repo && git restore .', 'git restore --staged --worktree .', 'git restore -S -W .']) {
    assert.ok(bash(c), c);
  }
});

test('Git-Sicherheitsgurt lässt gezieltes Zurücknehmen und Stash-Alltag durch', () => {
  for (const c of ['git checkout main', 'git checkout -b neu', 'git checkout -- zeiterfassung/app.js',
    'git restore zeiterfassung/app.js', 'git restore --staged .', 'git restore --staged -- .',
    'git stash', 'git stash push -m "zwischenstand"', 'git stash pop', 'git stash list', 'git stash show -p',
    'git commit -m "git checkout . und git stash clear verboten"']) {
    assert.equal(bash(c), null, c);
  }
});
