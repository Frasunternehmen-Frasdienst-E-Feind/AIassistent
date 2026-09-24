/**
 * Messe-Cockpit für "Aufgabenliste_Team_Marketing_FEIND"
 * InfraTech 2027 · Rotterdam Ahoy · 12.–15. Januar 2027
 * Fräsdienst-Service E. Feind GmbH
 *
 * Was dieses Skript tut (NICHT-DESTRUKTIV, nur ergänzend):
 *  1) Legt/aktualisiert den Tab "Messe-Aufgaben" an: ein Live-Cockpit
 *     (Countdown, Ampel, Budget) + eine LIVE-Ansicht (QUERY) aller
 *     InfraTech-Aufgaben aus dem Tab "Aufgaben" (Thema = Events,
 *     Unterthema enthält "INFRA"). Diese Ansicht spiegelt jede Änderung
 *     im Tab "Aufgaben" sofort – geplant/gepflegt wird weiterhin dort,
 *     damit die bestehende Team-Automatik (IDs, Wochenmail, Log) greift.
 *  2) "Messe-Aufgaben importieren" trägt die Aufgaben aus dem Claude-
 *     Cockpit (InfraTech 2027) als neue MK-Zeilen unten in "Aufgaben" ein
 *     (Thema Events / Unterthema "INFRA TECH 12. bis 15.01.2027"),
 *     idempotent (bereits vorhandene Aufgabentexte werden übersprungen).
 *
 * WICHTIG:
 *  - Nur der Eigentümer (David) sollte es einrichten. Vorab eine Kopie
 *    testen wird empfohlen; das Skript löscht nichts.
 *  - Corporate Design: Grün #84bb20 nur als Fläche, darauf Anthrazit
 *    #424e4e (nie Weiß); Rot #e3000b nur als Signal. Status steht immer
 *    als Text (nicht nur Farbe).
 */

// ==== Konstanten ====
var AUFGABEN_TAB   = 'Aufgaben';           // bestehender Haupt-Tab
var MESSE_TAB      = 'Messe-Aufgaben';     // neuer Tab (wird angelegt)
var THEMA          = 'Events';
var UNTERTHEMA     = 'INFRA TECH 12. bis 15.01.2027';
var VERANTWORTLICH = 'David';
var VERTRETUNG     = 'Karen';              // Standard-Vertretung laut Stammdaten
var MESSE_DATUM    = new Date(2027, 0, 12); // 12.01.2027 (Monat 0-basiert)

// CI-Tokens (branding/feind-ci.tokens.json)
var CI = { gruen:'#84bb20', anthrazit:'#424e4e', rot:'#e3000b', ink:'#3c5457',
           line:'#d5dada', surfaceMuted:'#f2f4f4', weiss:'#ffffff', accentText:'#5e8a14' };

// Aufgaben-Spalten (1-basiert): A..N
var COL = { id:1, thema:2, unterthema:3, aufgabe:4, prio:5, verantwortlich:6,
            vertretung:7, faellig:8, status:9, erledigt:10, ablage:11,
            notiz:12, geaendertAm:13, geaendertVon:14 };

/**
 * Aufgabenset aus dem Claude-Cockpit (InfraTech 2027).
 * dueOffset = Kalendertage relativ zum Messebeginn (negativ = vorher).
 * Nur zu importierende, operative Aufgaben – Verantwortlich = David,
 * im Sheet frei umverteilbar. Keine personenbezogenen Daten Dritter.
 */
function messeTasks_() {
  return [
    // Steuerung & Fristen
    {a:'2027-Handbuch, Standnummer & Portalzugänge bei Rotterdam Ahoy anfordern/bestätigen', p:'Hoch', off:-102, n:'Voraussetzung für alle weiteren Fristen.'},
    {a:'Verbindliche 2027-Fristenmatrix mit Ahoy verifizieren (Standentwurf, Anmeldeschluss, VRS/Slot, Auf-/Abbau)', p:'Hoch', off:-95, n:'2027 offiziell noch nicht publiziert – Fakt prüfen.'},
    {a:'Offizielle 2027-Sales-Kontaktperson bei infratech.nl erfragen', p:'Mittel', off:-102, n:'k.vlot@ahoy.nl laut Faktencheck unbestätigt.'},
    {a:'Budget-Forecast (24.200–26.500 € brutto) + Freigabegrenzen einrichten', p:'Mittel', off:-81, n:'Ziel: max. 10 % Abweichung. Bei Vertragsfragen Rechtsabteilung prüfen.'},
    // Innovationspreis
    {a:'Innovationspreis-Einsendung abschließen', p:'Hoch', off:-109, n:'FRIST PRÜFEN: Faktencheck 25.09.2026 vs. alte ToDo 31.10.2026.'},
    // Standbau & Technik
    {a:'Flächenentscheidung: 25 m² vs. größer/offener Eckstand', p:'Hoch', off:-88, n:'2026 zu eng für Vorher/Nachher-Demo.'},
    {a:'Standbau-Partner bestätigen (Global Expo Stand B.V./LOCO verifiziert; weitere prüfen)', p:'Mittel', off:-67},
    {a:'Standdesign/technische Abweichungen genehmigen lassen (>2,75 m)', p:'Hoch', off:-53, n:'Referenzfrist 2026: 21.11. – 2027 verifizieren.'},
    {a:'Eyecatcher/Grafik-Druck freigeben (leuchtendes Grün + Grinding-Schild)', p:'Mittel', off:-46},
    {a:'TV/Display buchen, Loop <3 min + Kopfhörer testen', p:'Mittel', off:-32},
    {a:'Möbelpaket, Teppichfarbe & Namensblende wählen', p:'Mittel', off:-6, n:'Referenzfrist 2026: 06.01.'},
    // Logistik
    {a:'Vertragsspediteur (DB Schenker) + Liefer-Slot buchen (kein eigener Stapler/Kran)', p:'Hoch', off:-46},
    {a:'Exponate final definieren: zwingend / optional / nicht mitnehmen', p:'Hoch', off:-74},
    {a:'Packliste mit Menge, Gewicht, Maß, Verantwortlichem & Rücktransport', p:'Mittel', off:-39},
    {a:'Empfangsperson + Ausweichperson je Lieferfenster benennen', p:'Mittel', off:-25},
    // Hotel & Reise
    {a:'Hotel buchen – ibis Styles Rotterdam Ahoy (einziges fußläufig)', p:'Mittel', off:-89, n:'Faktencheck: übrige Hotels ~5 km Zentrum.'},
    // Marketing
    {a:'Social-Media-Vorabkampagne planen (Instagram, LinkedIn, Signatur, Prä-Mail, Website)', p:'Mittel', off:-39},
    {a:'Flyer überarbeiten (Format DIN lang, Beleuchtung, Design)', p:'Mittel', off:-46},
    {a:'Nachfassmail neu: kurz, segmentiert, klare CTA + Special', p:'Mittel', off:-32},
    {a:'Giveaway-Strategie finalisieren (Zollstock, USB-Bauhelm, Warnweste, Isolierbecher, HARIBO)', p:'Niedrig', off:-60},
    // Leads & CRM
    {a:'Leadformular mit Pflichtfeldern etablieren (DSGVO)', p:'Hoch', off:-46},
    {a:'Zielkundenliste (Kommunen, Straßenbau, Infrastruktur, Partner) erstellen', p:'Mittel', off:-32},
    // Rotterdam/NL
    {a:'Zoll / Grenzübertritt Maschinen (NL) klären', p:'Mittel', off:-46, n:'Rechtsabteilung / Zoll prüfen.'},
    {a:'Versicherung NL abschließen', p:'Mittel', off:-40, n:'Rechtsabteilung prüfen.'},
    // Durchführung & Review
    {a:'Abschlussbericht <14 Tage: KPI, Kosten, Leads, Risiken, Lessons Learned', p:'Mittel', off:14}
  ];
}

// ==== Menü ====
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Messe-Cockpit')
    .addItem('Tab „Messe-Aufgaben" einrichten / aktualisieren', 'messeCockpitAktualisieren')
    .addItem('Cockpit-Aufgaben importieren (einmalig)', 'messeAufgabenImportieren')
    .addToUi();
}

function ss_() { return SpreadsheetApp.getActiveSpreadsheet(); }

// ==== 1) Tab "Messe-Aufgaben": Cockpit + Live-Ansicht ====
function messeCockpitAktualisieren() {
  var ss = ss_();
  if (!ss.getSheetByName(AUFGABEN_TAB)) {
    SpreadsheetApp.getUi().alert('Tab "' + AUFGABEN_TAB + '" nicht gefunden. Bitte Tab-Namen im Skript (AUFGABEN_TAB) anpassen.');
    return;
  }
  var sh = ss.getSheetByName(MESSE_TAB) || ss.insertSheet(MESSE_TAB, 0);
  sh.clear();
  sh.setHiddenGridlines(true);

  // Kopf / Titel
  sh.getRange('A1').setValue('MESSE-COCKPIT · INFRATECH 2027 · ROTTERDAM AHOY')
    .setFontFamily('Arial').setFontSize(14).setFontWeight('bold').setFontColor(CI.anthrazit);
  sh.getRange('A1:G1').merge().setBackground(CI.gruen);
  sh.getRange('A2').setValue('12.–15. Januar 2027 · Live-Ansicht aus Tab „Aufgaben" (Thema Events / InfraTech) · Bearbeiten bitte im Tab „Aufgaben".')
    .setFontColor(CI.ink).setFontSize(10);
  sh.getRange('A2:G2').merge();

  // Kennzahlen-Block (Ampel) – Zeile 4/5
  var afmt = function(rng){ return "COUNTIFS(" + AUFGABEN_TAB + "!$B:$B,\"" + THEMA + "\"," + AUFGABEN_TAB + "!$C:$C,\"*INFRA*\"" + rng + ")"; };
  var labels = ['Tage bis Messe','Gesamt','Aktiv (offen)','Überfällig','Fällig ≤ 14 Tage','Erledigt'];
  var formulas = [
    '=DATE(2027,1,12)-TODAY()',
    '=' + afmt(''),
    '=' + afmt(',' + AUFGABEN_TAB + '!$I:$I,"<>Erledigt"'),
    '=' + afmt(',' + AUFGABEN_TAB + '!$I:$I,"<>Erledigt",' + AUFGABEN_TAB + '!$H:$H,"<"&TODAY(),' + AUFGABEN_TAB + '!$H:$H,"<>"'),
    '=' + afmt(',' + AUFGABEN_TAB + '!$I:$I,"<>Erledigt",' + AUFGABEN_TAB + '!$H:$H,">="&TODAY(),' + AUFGABEN_TAB + '!$H:$H,"<="&(TODAY()+14)'),
    '=' + afmt(',' + AUFGABEN_TAB + '!$I:$I,"Erledigt"')
  ];
  for (var i = 0; i < 6; i++) {
    var c = i + 1;
    sh.getRange(4, c).setFormula(formulas[i]).setFontFamily('Arial').setFontSize(18)
      .setFontWeight('bold').setFontColor(CI.anthrazit).setHorizontalAlignment('center');
    sh.getRange(5, c).setValue(labels[i]).setFontColor(CI.ink).setFontSize(10)
      .setHorizontalAlignment('center');
  }
  // Signalfarbe (Rot) nur als Textsignal bei "Überfällig"
  sh.getRange(4,4).setFontColor(CI.rot);

  // Budget-Hinweis
  sh.getRange('A7').setValue('Budgetrahmen 2027: 24.200–26.500 € brutto (Baseline 2026: 21.023 €). Ziel ≤ 10 % Abweichung.')
    .setFontColor(CI.ink).setFontSize(10);
  sh.getRange('A7:G7').merge();

  // Tabellenkopf (Zeile 9) + Live-QUERY (ab Zeile 10)
  var heads = ['ID','Aufgabe / Beschreibung','Priorität','Verantwortlich','Fällig bis','Status','Notiz / Nächster Schritt'];
  sh.getRange(9,1,1,heads.length).setValues([heads])
    .setBackground(CI.anthrazit).setFontColor(CI.weiss).setFontWeight('bold').setFontSize(11);
  var query = '=IFERROR(QUERY(' + AUFGABEN_TAB + '!A2:N, '
    + '"select A, D, E, F, H, I, L where B = \'' + THEMA + '\' and upper(C) contains \'INFRA\' order by H", 0), '
    + '"Noch keine InfraTech-Aufgaben im Tab Aufgaben.")';
  sh.getRange(10,1).setFormula(query);

  // Spaltenbreiten
  var widths = [90, 360, 90, 120, 100, 100, 300];
  for (var w = 0; w < widths.length; w++) sh.setColumnWidth(w+1, widths[w]);
  sh.setFrozenRows(9);

  SpreadsheetApp.getUi().alert('„Messe-Aufgaben" ist eingerichtet/aktualisiert. Die Tabelle spiegelt live den Tab „Aufgaben".');
}

// ==== 2) Cockpit-Aufgaben in "Aufgaben" importieren (idempotent) ====
function messeAufgabenImportieren() {
  var ss = ss_();
  var sh = ss.getSheetByName(AUFGABEN_TAB);
  if (!sh) { SpreadsheetApp.getUi().alert('Tab "' + AUFGABEN_TAB + '" nicht gefunden.'); return; }

  var data = sh.getDataRange().getValues();
  // vorhandene InfraTech-Aufgabentexte sammeln (Duplikate vermeiden)
  var vorhanden = {};
  var maxNum = 0;
  for (var r = 0; r < data.length; r++) {
    var id = String(data[r][COL.id-1] || '');
    var m = id.match(/MK-(\d+)/i);
    if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
    var c = String(data[r][COL.unterthema-1] || '');
    if (/INFRA/i.test(c)) vorhanden[String(data[r][COL.aufgabe-1] || '').trim()] = true;
  }

  var tasks = messeTasks_();
  var neu = [];
  tasks.forEach(function(t) {
    if (vorhanden[t.a.trim()]) return; // schon vorhanden
    maxNum++;
    var faellig = new Date(MESSE_DATUM.getTime());
    faellig.setDate(faellig.getDate() + t.off);
    var row = new Array(14).fill('');
    row[COL.id-1]            = 'MK-' + ('000' + maxNum).slice(-3);
    row[COL.thema-1]         = THEMA;
    row[COL.unterthema-1]    = UNTERTHEMA;
    row[COL.aufgabe-1]       = t.a;
    row[COL.prio-1]          = t.p || 'Mittel';
    row[COL.verantwortlich-1]= VERANTWORTLICH;
    row[COL.vertretung-1]    = VERTRETUNG;
    row[COL.faellig-1]       = faellig;
    row[COL.status-1]        = 'Offen';
    row[COL.notiz-1]         = t.n || '';
    row[COL.geaendertAm-1]   = new Date();
    row[COL.geaendertVon-1]  = 'Messe-Cockpit (Import)';
    neu.push(row);
  });

  if (!neu.length) {
    SpreadsheetApp.getUi().alert('Nichts zu importieren – alle Cockpit-Aufgaben sind bereits vorhanden.');
    return;
  }
  var start = sh.getLastRow() + 1;
  sh.getRange(start, 1, neu.length, 14).setValues(neu);
  // Fälligkeits-Spalte als Datum formatieren
  sh.getRange(start, COL.faellig, neu.length, 1).setNumberFormat('dd.mm.yyyy');
  SpreadsheetApp.getUi().alert(neu.length + ' Messe-Aufgaben importiert (Thema Events / InfraTech). '
    + 'Bitte Verantwortliche bei Bedarf im Tab „Aufgaben" anpassen.');
}
