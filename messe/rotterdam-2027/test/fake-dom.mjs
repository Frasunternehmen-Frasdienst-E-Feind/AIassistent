// Minimales Dokument für Node-Tests der Diagramm-Bausteine: Elemente mit Attributen, Kindern, Text und
// Ereignissen. Kein Layout, kein animate(); damit prüfen die Tests den Endzustand, den auch der Druck zeigt.
class FakeNode {
  constructor(tag, ns) { this.tagName = tag; this.namespaceURI = ns || null; this.attrs = {}; this.children = []; this.listeners = {}; this._text = ''; }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
  append(...kids) { for (const k of kids) this.children.push(typeof k === 'string' ? new FakeText(k) : k); }
  addEventListener(type, fn) { (this.listeners[type] = this.listeners[type] || []).push(fn); }
  dispatch(type, ev) { for (const fn of this.listeners[type] || []) fn(Object.assign({ preventDefault() {} }, ev)); }
  get textContent() { return this._text + this.children.map(c => c.textContent).join(''); }
  set textContent(v) { this.children = []; this._text = String(v); }
  // Alle Nachfahren (inkl. sich selbst), optional gefiltert.
  all(pred) { const out = []; const walk = n => { if (!(n instanceof FakeNode)) return; if (!pred || pred(n)) out.push(n); n.children.forEach(walk); }; walk(this); return out; }
  byClass(cls) { return this.all(n => (n.attrs.class || '').split(/\s+/).includes(cls)); }
  byTag(tag) { return this.all(n => n.tagName === tag); }
}
class FakeText { constructor(t) { this.textContent = t; } }

export function fakeDocument() {
  return {
    createElement: tag => new FakeNode(tag),
    createElementNS: (ns, tag) => new FakeNode(tag, ns)
  };
}
