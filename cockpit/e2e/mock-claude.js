/* Testdouble der claude.ai-Artefakt-Laufzeit (Vertrag 0.2.61) für E2E-Tests.
   Wird per page.addInitScript vor dem Seitenskript geladen. Konfiguration über
   window.__mockCfg = { canWrite, isOwner, canEdit, seed: { 'col/id': {...} }, sample: true }.
   Nur für Tests – enthält keine echten Daten. */
(function () {
  const cfg = Object.assign({ canWrite: true, isOwner: true, canEdit: true, seed: {}, sample: true, meId: 'u_test_owner_000000000000' }, window.__mockCfg || {});
  const store = new Map(Object.entries(cfg.seed).map(([k, v]) => [k, JSON.parse(JSON.stringify(v))]));
  const listeners = new Set();
  const err = code => Object.assign(new Error(code), { code });
  const snapDoc = (path) => { const id = path.split('/').pop(); const v = store.get(path); return { id, exists: v !== undefined, data: () => v === undefined ? undefined : JSON.parse(JSON.stringify(v)), metadata: { fromCache: false, hasPendingWrites: false } }; };
  const colDocs = col => [...store.keys()].filter(k => k.startsWith(col + '/') && k.split('/').length === col.split('/').length + 1).sort().map(snapDoc);
  const notify = () => setTimeout(() => listeners.forEach(fn => fn()), 0);
  const guard = () => { if (!cfg.canWrite) throw err('invalid_argument'); };
  function docRef(path) {
    return {
      id: path.split('/').pop(), path,
      async get() { return snapDoc(path); },
      async set(data) { guard(); if (path.startsWith('admin/') && !cfg.canEdit && !cfg.isOwner) throw err('invalid_argument'); store.set(path, JSON.parse(JSON.stringify(data))); notify(); },
      async update(data) { guard(); if (!store.has(path)) throw err('invalid_argument'); store.set(path, Object.assign({}, store.get(path), JSON.parse(JSON.stringify(data)))); notify(); },
      async delete() { guard(); store.delete(path); notify(); },
      onSnapshot(next) { const fn = () => next(snapDoc(path)); listeners.add(fn); setTimeout(fn, 0); return () => listeners.delete(fn); },
      collection(sub) { return colRef(path + '/' + sub); }
    };
  }
  function colRef(col) {
    const q = {
      path: col, doc: id => docRef(col + '/' + (id || ('m' + Math.random().toString(36).slice(2)))),
      async add(data) { const r = q.doc(); await r.set(data); return r; },
      async get() { const docs = colDocs(col); return { docs, size: docs.length, empty: !docs.length, docChanges: () => [], metadata: {} }; },
      onSnapshot(next) { const fn = () => { const docs = colDocs(col); next({ docs, size: docs.length, empty: !docs.length, docChanges: () => [], metadata: {} }); }; listeners.add(fn); setTimeout(fn, 0); return () => listeners.delete(fn); },
      where() { return q; }, orderBy() { return q; }, limit() { return q; }
    };
    return q;
  }
  const db = { doc: docRef, collection: colRef };
  const user = {
    async me() { return { id: cfg.meId, name: 'Testperson', avatarUrl: '', color: '', email: null, isOwner: cfg.isOwner, canEdit: cfg.canEdit }; },
    async id() { return cfg.meId; }, async isOwner() { return cfg.isOwner; }, async canEdit() { return cfg.canEdit; },
    async can(name) { return name === 'data.write' ? cfg.canWrite : null; },
    async profiles(ids) { const o = {}; [].concat(ids).forEach(id => { o[id] = { id, name: id === cfg.meId ? 'Testperson' : 'Kollege', avatarUrl: '', color: '', email: null, isMe: id === cfg.meId, guest: false }; }); return o; },
    async search() { return [{ id: 'u_test_colleague_00000000', name: 'Kollege', avatarUrl: '', color: '', email: null, isMe: false, guest: false }]; }
  };
  const sample = async (prompt, opts) => { window.__lastPrompt = prompt; if (opts && opts.onText) opts.onText({ text: '{', delta: '{' }); return { text: JSON.stringify({ summary: 'Testbrief aus Mock.', items: [{ module: 'infratech', severity: 'kritisch', text: 'Test-Hinweis (s1).' }], weekPlan: [{ day: 'Mo', task: 'Test', module: 'infratech' }] }), truncated: false }; };
  const saved = []; const downloads = { async save(f) { saved.push(f); window.__downloads = saved; } };
  const caps = { db, user, sample: cfg.sample ? sample : null, downloads, assets: null };
  window.claude = { use: name => new Promise(res => setTimeout(() => res(caps[name] || null), 5)) };
  window.__mockStore = store;
})();
