/* <pruefung.js> – Zusatzprüfungen je Tag. Wird unverändert in index.html
   eingebettet (Test prüft die Gleichheit); läuft im Browser und in Node.
   Nur Anzeige: nichts wird automatisch korrigiert. */
var AzkPruefung = (function () {
  "use strict";
  /* ArbZG §4 Satz 2/3: höchstens 6 h am Stück; als Ruhepause zählen
     Abschnitte ab 15 Minuten. Grenze für "ungewöhnlich lange Pause" ist
     eine Annahme (2 h) – bitte Rechtsabteilung prüfen. */
  var BLOCK_MAX = 360, REST_MIN = 15, LONG_PAUSE = 120;

  function toMin(t) {
    var m = /^(\d{1,2}):(\d{2})/.exec(t || "");
    if (!m || +m[1] > 23 || +m[2] > 59) return null;
    return +m[1] * 60 + +m[2];
  }
  function sorted(books) {
    return (books || []).filter(function (b) { return b && toMin(b.start) != null; })
      .slice().sort(function (a, b) { return toMin(a.start) - toMin(b.start); });
  }

  /* Arbeitsblöcke: Arbeit am Stück, nur durch Pausen ab REST_MIN getrennt.
     Kürzere Pausen und Lücken unterbrechen den Block nicht, zählen aber
     nicht als Arbeitszeit. Offene Buchungen beenden die Auswertung. */
  function blocks(books) {
    var out = [], cur = null;
    sorted(books).forEach(function (b) {
      var s = toMin(b.start), e = toMin(b.end);
      if (e == null || e <= s) return;
      if (b.kind === "pause") {
        if (e - s >= REST_MIN && cur) { out.push(cur); cur = null; }
        return;
      }
      if (!cur) cur = { start: b.start, end: b.end, work: 0 };
      cur.end = b.end;
      cur.work += e - s;
    });
    if (cur) out.push(cur);
    return out;
  }

  function check(books) {
    var list = sorted(books), res = { longBlocks: [], longPauses: [], overlaps: [], endBeforeStart: [] };
    blocks(list).forEach(function (bl) {
      var span = toMin(bl.end) - toMin(bl.start);
      if (span > BLOCK_MAX) res.longBlocks.push({ start: bl.start, end: bl.end, min: span });
    });
    var prevEnd = null, prev = null;
    list.forEach(function (b) {
      var s = toMin(b.start), e = toMin(b.end);
      if (e != null && e <= s) res.endBeforeStart.push({ start: b.start, end: b.end });
      else if (b.kind === "pause" && e != null && e - s > LONG_PAUSE) res.longPauses.push({ start: b.start, end: b.end, min: e - s });
      if (prevEnd != null && s < prevEnd) res.overlaps.push({ a: prev.start + "–" + prev.end, b: b.start + "–" + (b.end || "offen") });
      if (e != null && e > s && (prevEnd == null || e > prevEnd)) { prevEnd = e; prev = b; }
    });
    res.any = res.longBlocks.length + res.longPauses.length + res.overlaps.length + res.endBeforeStart.length > 0;
    return res;
  }

  /* Anwesenheit brutto: erstes Kommen bis letztes Gehen; offen = null. */
  function brutto(books) {
    var list = sorted(books);
    if (!list.length) return 0;
    var s = toMin(list[0].start), last = -1;
    for (var i = 0; i < list.length; i++) {
      var e = toMin(list[i].end);
      if (e == null) return null;
      if (e > last) last = e;
    }
    return last > s ? last - s : 0;
  }

  /* Laufende Netto-Arbeitszeit in Sekunden bis jetzt (offene Arbeitsbuchung
     läuft mit). nowSec = Sekunden seit Mitternacht. */
  function liveSeconds(books, nowSec) {
    var sum = 0;
    sorted(books).forEach(function (b) {
      if (b.kind === "pause") return;
      var s = toMin(b.start) * 60, e = b.end == null ? nowSec : toMin(b.end);
      if (b.end != null) e = e == null ? null : e * 60;
      if (e != null && e > s) sum += e - s;
    });
    return sum;
  }

  return { BLOCK_MAX: BLOCK_MAX, REST_MIN: REST_MIN, LONG_PAUSE: LONG_PAUSE,
    blocks: blocks, check: check, brutto: brutto, liveSeconds: liveSeconds };
})();
if (typeof module === "object" && module.exports) module.exports = AzkPruefung;
/* </pruefung.js> */
