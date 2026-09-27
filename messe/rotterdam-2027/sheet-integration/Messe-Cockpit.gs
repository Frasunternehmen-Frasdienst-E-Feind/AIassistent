/**
 * Messe-Cockpit für "Aufgabenliste_Team_Marketing_FEIND"
 * InfraTech 2027 · Rotterdam Ahoy · 12.–15. Januar 2027
 * Fräsdienst-Service E. Feind GmbH
 *
 * ROBUST: erkennt den Aufgaben-Tab, die Kopfzeile und die Spalten
 * AUTOMATISCH – der Tab muss nicht "Aufgaben" heißen und die
 * Spaltenreihenfolge darf abweichen. Nichts wird gelöscht.
 *
 *  1) "Tab Messe-Aufgaben einrichten/aktualisieren": Live-Cockpit
 *     (Countdown, Ampel, Budget) + Live-QUERY der InfraTech-Aufgaben
 *     (Thema = Events, Unterthema enthält "INFRA") aus dem erkannten Tab.
 *  2) "Cockpit-Aufgaben importieren": trägt die InfraTech-Aufgaben aus dem
 *     Claude-Cockpit einmalig/idempotent unten im Aufgaben-Tab ein.
 *
 * CI: Grün #84bb20 nur Fläche, darauf Anthrazit #424e4e (nie Weiß);
 * Rot #e3000b nur als Signal; Status immer als Text.
 */

var MESSE_TAB   = 'Messe-Aufgaben';
var THEMA       = 'Events';
var UNTERTHEMA  = 'INFRA TECH 12. bis 15.01.2027';
var VERANTWORTLICH = 'David';
var VERTRETUNG  = 'Karen';
var MESSE_DATUM = new Date(2027, 0, 12); // 12.01.2027

var CI = { gruen:'#84bb20', anthrazit:'#424e4e', rot:'#e3000b', ink:'#3c5457',
           line:'#d5dada', surfaceMuted:'#f2f4f4', weiss:'#ffffff' };

// ---- Aufgabenset aus dem Claude-Cockpit (dueOffset = Tage relativ zum 12.01.2027) ----
function messeTasks_() {
  return [
    {a:'2027-Handbuch, Standnummer & Portalzugänge bei Rotterdam Ahoy anfordern/bestätigen', p:'Hoch', off:-102, n:'Voraussetzung für alle weiteren Fristen.'},
    {a:'Verbindliche 2027-Fristenmatrix mit Ahoy verifizieren (Standentwurf, Anmeldeschluss, VRS/Slot, Auf-/Abbau)', p:'Hoch', off:-95, n:'2027 offiziell noch nicht publiziert – Fakt prüfen.'},
    {a:'Offizielle 2027-Sales-Kontaktperson bei infratech.nl erfragen', p:'Mittel', off:-102, n:'k.vlot@ahoy.nl laut Faktencheck unbestätigt.'},
    {a:'Budget-Forecast (24.200–26.500 € brutto) + Freigabegrenzen einrichten', p:'Mittel', off:-81, n:'Ziel: max. 10 % Abweichung. Bei Vertragsfragen Rechtsabteilung prüfen.'},
    {a:'Innovationspreis-Einsendung abschließen', p:'Hoch', off:-109, n:'FRIST PRÜFEN: Faktencheck 25.09.2026 vs. alte ToDo 31.10.2026.'},
    {a:'Flächenentscheidung: 25 m² vs. größer/offener Eckstand', p:'Hoch', off:-88, n:'2026 zu eng für Vorher/Nachher-Demo.'},
    {a:'Standbau-Partner bestätigen (Global Expo Stand B.V./LOCO verifiziert; weitere prüfen)', p:'Mittel', off:-67},
    {a:'Standdesign/technische Abweichungen genehmigen lassen (>2,75 m)', p:'Hoch', off:-53, n:'Referenzfrist 2026: 21.11. – 2027 verifizieren.'},
    {a:'Eyecatcher/Grafik-Druck freigeben (leuchtendes Grün + Grinding-Schild)', p:'Mittel', off:-46},
    {a:'TV/Display buchen, Loop <3 min + Kopfhörer testen', p:'Mittel', off:-32},
    {a:'Möbelpaket, Teppichfarbe & Namensblende wählen', p:'Mittel', off:-6, n:'Referenzfrist 2026: 06.01.'},
    {a:'Vertragsspediteur (DB Schenker) + Liefer-Slot buchen (kein eigener Stapler/Kran)', p:'Hoch', off:-46},
    {a:'Exponate final definieren: zwingend / optional / nicht mitnehmen', p:'Hoch', off:-74},
    {a:'Packliste mit Menge, Gewicht, Maß, Verantwortlichem & Rücktransport', p:'Mittel', off:-39},
    {a:'Empfangsperson + Ausweichperson je Lieferfenster benennen', p:'Mittel', off:-25},
    {a:'Hotel buchen – ibis Styles Rotterdam Ahoy (einziges fußläufig)', p:'Mittel', off:-89, n:'Faktencheck: übrige Hotels ~5 km Zentrum.'},
    {a:'Social-Media-Vorabkampagne planen (Instagram, LinkedIn, Signatur, Prä-Mail, Website)', p:'Mittel', off:-39},
    {a:'Flyer überarbeiten (Format DIN lang, Beleuchtung, Design)', p:'Mittel', off:-46},
    {a:'Nachfassmail neu: kurz, segmentiert, klare CTA + Special', p:'Mittel', off:-32},
    {a:'Giveaway-Strategie finalisieren (Zollstock, USB-Bauhelm, Warnweste, Isolierbecher, HARIBO)', p:'Niedrig', off:-60},
    {a:'Leadformular mit Pflichtfeldern etablieren (DSGVO)', p:'Hoch', off:-46},
    {a:'Zielkundenliste (Kommunen, Straßenbau, Infrastruktur, Partner) erstellen', p:'Mittel', off:-32},
    {a:'Zoll / Grenzübertritt Maschinen (NL) klären', p:'Mittel', off:-46, n:'Rechtsabteilung / Zoll prüfen.'},
    {a:'Versicherung NL abschließen', p:'Mittel', off:-40, n:'Rechtsabteilung prüfen.'},
    {a:'Abschlussbericht <14 Tage: KPI, Kosten, Leads, Risiken, Lessons Learned', p:'Mittel', off:14}
  ];
}

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Messe-Cockpit')
    .addItem('Tab „Messe-Aufgaben" einrichten / aktualisieren', 'messeCockpitAktualisieren')
    .addItem('Cockpit-Aufgaben importieren (einmalig)', 'messeAufgabenImportieren')
    .addItem('Erkannten Aufgaben-Tab anzeigen', 'messeTabAnzeigen')
    .addToUi();
}
function ss_() { return SpreadsheetApp.getActiveSpreadsheet(); }

// ---- Spaltenbuchstabe aus 1-basiertem Index ----
function colLetter_(n) { var s=''; while(n>0){ var m=(n-1)%26; s=String.fromCharCode(65+m)+s; n=Math.floor((n-m-1)/26);} return s; }
// ---- Tab-Referenz für Formeln (mit Anführungszeichen bei Sonderzeichen) ----
function tabRef_(name){ return /^[A-Za-z0-9_]+$/.test(name) ? name : "'" + name.replace(/'/g,"''") + "'"; }

/**
 * Erkennt den Aufgaben-Tab automatisch: sucht das Blatt mit einer Kopfzeile,
 * die mindestens ID, Thema, Aufgabe und Status enthält. Liefert Sheet,
 * Kopfzeilen-Index und die Spalten-Indizes je Feld.
 */
function findeAufgaben_() {
  var felder = {
    id:/^id$/i, thema:/^thema$/i, unterthema:/unterthema|projekt/i,
    aufgabe:/aufgabe|beschreib/i, prio:/priorit/i, verantwortlich:/verantwort/i,
    vertretung:/vertret/i, faellig:/f(ä|ae)llig/i, status:/^status$/i,
    erledigt:/erledigt/i, ablage:/ablage|link/i, notiz:/notiz|schritt/i,
    geaendertAm:/ge(ä|ae)ndert am/i, geaendertVon:/ge(ä|ae)ndert von/i
  };
  var sheets = ss_().getSheets();
  for (var s=0; s<sheets.length; s++) {
    var sh = sheets[s];
    if (sh.getName() === MESSE_TAB) continue;
    var maxR = Math.min(20, sh.getLastRow());
    if (maxR < 1) continue;
    var maxC = Math.min(30, sh.getLastColumn());
    if (maxC < 4) continue;
    var vals = sh.getRange(1,1,maxR,maxC).getValues();
    for (var r=0; r<vals.length; r++) {
      var col = {};
      for (var c=0; c<vals[r].length; c++) {
        var t = String(vals[r][c]).trim();
        if (!t) continue;
        for (var f in felder) { if (col[f]==null && felder[f].test(t)) col[f] = c+1; }
      }
      if (col.id && col.thema && col.aufgabe && col.status) {
        return { sheet: sh, name: sh.getName(), headerRow: r+1, col: col };
      }
    }
  }
  return null;
}

function messeTabAnzeigen() {
  var a = findeAufgaben_();
  var ui = SpreadsheetApp.getUi();
  if (!a) { ui.alert('Kein Aufgaben-Tab erkannt (Kopfzeile mit ID/Thema/Aufgabe/Status nicht gefunden).'); return; }
  ui.alert('Erkannter Aufgaben-Tab: „' + a.name + '"  ·  Kopfzeile in Zeile ' + a.headerRow + '.');
}

// ---- 1) Tab "Messe-Aufgaben": Cockpit + Live-Ansicht ----
function messeCockpitAktualisieren() {
  var ui = SpreadsheetApp.getUi();
  var a = findeAufgaben_();
  if (!a) { ui.alert('Kein Aufgaben-Tab erkannt. Bitte sicherstellen, dass ein Blatt eine Kopfzeile mit ID/Thema/Aufgabe/Status hat.'); return; }
  var ref = tabRef_(a.name);
  var Lthema  = colLetter_(a.col.thema),  Lunter = colLetter_(a.col.unterthema || a.col.thema);
  var Lstatus = colLetter_(a.col.status), Lfaell = colLetter_(a.col.faellig || a.col.status);

  var ss = ss_();
  var sh = ss.getSheetByName(MESSE_TAB) || ss.insertSheet(MESSE_TAB, 0);
  sh.clear();
  sh.setHiddenGridlines(true);

  sh.getRange('A1').setValue('MESSE-COCKPIT · INFRATECH 2027 · ROTTERDAM AHOY')
    .setFontFamily('Arial').setFontSize(14).setFontWeight('bold').setFontColor(CI.anthrazit);
  sh.getRange('A1:G1').merge().setBackground(CI.gruen);
  sh.getRange('A2').setValue('12.–15. Januar 2027 · Live-Ansicht aus Tab „' + a.name + '" (Thema Events / InfraTech). Bearbeiten bitte dort.')
    .setFontColor(CI.ink).setFontSize(10);
  sh.getRange('A2:G2').merge();

  // Ampel (COUNTIFS auf erkannten Tab/Spalten)
  var base = 'COUNTIFS(' + ref + '!' + Lthema + ':' + Lthema + ',"' + THEMA + '",' + ref + '!' + Lunter + ':' + Lunter + ',"*INFRA*"';
  var labels = ['Tage bis Messe','Gesamt','Aktiv (offen)','Überfällig','Fällig ≤ 14 Tage','Erledigt'];
  var formulas = [
    '=DATE(2027,1,12)-TODAY()',
    '=' + base + ')',
    '=' + base + ',' + ref + '!' + Lstatus + ':' + Lstatus + ',"<>Erledigt")',
    '=' + base + ',' + ref + '!' + Lstatus + ':' + Lstatus + ',"<>Erledigt",' + ref + '!' + Lfaell + ':' + Lfaell + ',"<"&TODAY(),' + ref + '!' + Lfaell + ':' + Lfaell + ',"<>")',
    '=' + base + ',' + ref + '!' + Lstatus + ':' + Lstatus + ',"<>Erledigt",' + ref + '!' + Lfaell + ':' + Lfaell + ',">="&TODAY(),' + ref + '!' + Lfaell + ':' + Lfaell + ',"<="&(TODAY()+14))',
    '=' + base + ',' + ref + '!' + Lstatus + ':' + Lstatus + ',"Erledigt")'
  ];
  for (var i=0;i<6;i++){
    sh.getRange(4,i+1).setFormula(formulas[i]).setFontFamily('Arial').setFontSize(18)
      .setFontWeight('bold').setFontColor(CI.anthrazit).setHorizontalAlignment('center');
    sh.getRange(5,i+1).setValue(labels[i]).setFontColor(CI.ink).setFontSize(10).setHorizontalAlignment('center');
  }
  sh.getRange(4,4).setFontColor(CI.rot); // Überfällig = Signalfarbe

  sh.getRange('A7').setValue('Budgetrahmen 2027: 24.200–26.500 € brutto (Baseline 2026: 21.023 €). Ziel ≤ 10 % Abweichung.')
    .setFontColor(CI.ink).setFontSize(10);
  sh.getRange('A7:G7').merge();

  // Live-Tabelle
  var heads = ['ID','Aufgabe / Beschreibung','Priorität','Verantwortlich','Fällig bis','Status','Notiz / Nächster Schritt'];
  sh.getRange(9,1,1,heads.length).setValues([heads])
    .setBackground(CI.anthrazit).setFontColor(CI.weiss).setFontWeight('bold').setFontSize(11);

  var Lid = colLetter_(a.col.id), Lauf = colLetter_(a.col.aufgabe),
      Lprio = colLetter_(a.col.prio || a.col.aufgabe), Lver = colLetter_(a.col.verantwortlich || a.col.aufgabe),
      Lnotiz = colLetter_(a.col.notiz || a.col.aufgabe);
  var lastCol = colLetter_(Math.max.apply(null, Object.keys(a.col).map(function(k){return a.col[k];})));
  var range = ref + '!A' + (a.headerRow+1) + ':' + lastCol;
  var sel = 'select ' + [Lid,Lauf,Lprio,Lver,Lfaell,Lstatus,Lnotiz].join(', ')
          + " where " + Lthema + " = '" + THEMA + "' and upper(" + Lunter + ") contains 'INFRA' order by " + Lfaell;
  var query = '=IFERROR(QUERY(' + range + ', "' + sel + '", 0), "Noch keine InfraTech-Aufgaben im Aufgaben-Tab.")';
  sh.getRange(10,1).setFormula(query);

  var widths=[90,360,90,120,100,100,300];
  for (var w=0;w<widths.length;w++) sh.setColumnWidth(w+1, widths[w]);
  sh.setFrozenRows(9);
  ui.alert('„Messe-Aufgaben" eingerichtet/aktualisiert (Quelle: Tab „' + a.name + '"). Die Tabelle spiegelt live.');
}

// ---- 2) Cockpit-Aufgaben importieren (idempotent) ----
function messeAufgabenImportieren() {
  var ui = SpreadsheetApp.getUi();
  var a = findeAufgaben_();
  if (!a) { ui.alert('Kein Aufgaben-Tab erkannt.'); return; }
  var sh = a.sheet, col = a.col;
  var data = sh.getDataRange().getValues();

  var vorhanden = {}, maxNum = 0;
  for (var r=0;r<data.length;r++){
    var id = String(data[r][col.id-1]||''); var m = id.match(/MK-(\d+)/i);
    if (m) maxNum = Math.max(maxNum, parseInt(m[1],10));
    var c = String((col.unterthema? data[r][col.unterthema-1] : '')||'');
    if (/INFRA/i.test(c)) vorhanden[String(data[r][col.aufgabe-1]||'').trim()] = true;
  }

  var tasks = messeTasks_(), neu = [], nCols = sh.getLastColumn();
  tasks.forEach(function(t){
    if (vorhanden[t.a.trim()]) return;
    maxNum++;
    var faellig = new Date(MESSE_DATUM.getTime()); faellig.setDate(faellig.getDate()+t.off);
    var row = new Array(nCols).fill('');
    function put(field, val){ if (col[field] && col[field]<=nCols) row[col[field]-1] = val; }
    put('id','MK-'+('000'+maxNum).slice(-3));
    put('thema',THEMA); put('unterthema',UNTERTHEMA); put('aufgabe',t.a);
    put('prio',t.p||'Mittel'); put('verantwortlich',VERANTWORTLICH); put('vertretung',VERTRETUNG);
    put('faellig',faellig); put('status','Offen'); put('notiz',t.n||'');
    put('geaendertAm',new Date()); put('geaendertVon','Messe-Cockpit (Import)');
    neu.push(row);
  });

  if (!neu.length){ ui.alert('Nichts zu importieren – alle Cockpit-Aufgaben sind bereits vorhanden.'); return; }
  var start = sh.getLastRow()+1;
  sh.getRange(start,1,neu.length,nCols).setValues(neu);
  if (col.faellig) sh.getRange(start,col.faellig,neu.length,1).setNumberFormat('dd.mm.yyyy');
  ui.alert(neu.length + ' Messe-Aufgaben importiert (Tab „' + a.name + '", Thema Events / InfraTech). Verantwortliche bei Bedarf dort anpassen.');
}
