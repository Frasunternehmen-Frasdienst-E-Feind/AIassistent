package main

// diagnose.go – Diagnosebericht über den OptiTime-Ordner: welche Dateien liegen dort,
// welche Formate wurden erkannt, wie viele Zeilen, Felder und Datensätze sie haben.
// Der Bericht zeigt nur Struktur und Anzahlen – keine Datenzeilen, keine Namen
// oder Personalnummern anderer und keine Konfigurationswerte außerhalb einer
// Positivliste. Einzige Ausnahme: wenige eigene Buchungen zur Kontrolle der
// Erkennung. Er ist zum Weitergeben an den Entwickler gedacht.

import (
	"errors"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"time"
)

const (
	diagMaxFiles  = 400
	diagMaxConfig = 200
)

func (a *App) diagnose() string {
	a.mu.Lock()
	id := a.identityWithProfile()
	sync := a.sync
	explicit, configured := a.explicit, a.cfg.OptiTimePath
	a.mu.Unlock()

	var b strings.Builder
	w := func(f string, args ...interface{}) { fmt.Fprintf(&b, f+"\n", args...) }
	w("Stempeluhr %s – Diagnose vom %s", version, time.Now().Format("02.01.2006 15:04:05"))
	w("Benutzer: %s\\%s (%s) auf %s, Quelle: %s", id.Domain, id.Username, id.FullName, id.Host, id.Source)
	w("Profil: %s", id.ProfileDir)
	w("Kennungen: %s | bestätigt: %s", strings.Join(id.Keys, "; "), strings.Join(id.ConfirmedKeys, "; "))
	path, source, searched := findOptiTimePath(explicit, configured, id.ProfileDir)
	w("OptiTime-Ordner: %q (%s)", path, source)
	w("Geprüfte Orte (%d): %s", len(searched), strings.Join(searched, " | "))
	w("Letzter Abgleich: %s, %d Buchungen, Zuordnung %q (automatisch: %v), Fehler: %s",
		sync.At.Format("15:04:05"), sync.Imported, sync.Identity.MatchedPerson, sync.Identity.AutoMatched, strings.Join(sync.Errors, "; "))
	if path == "" {
		return b.String()
	}

	w("")
	w("== Dateien unter %s ==", path)
	var all []string
	_ = filepath.WalkDir(path, func(p string, d os.DirEntry, err error) error {
		if err != nil {
			w("  Fehler beim Durchsuchen: %v", errNoPath(err))
			return nil
		}
		if d.IsDir() {
			return nil
		}
		all = append(all, p)
		if len(all) >= diagMaxFiles {
			return filepath.SkipAll
		}
		return nil
	})
	sort.Strings(all)
	label := map[string]string{}
	for i, p := range all {
		label[p] = diagLabel(p, i+1)
	}
	for _, p := range all {
		info, err := os.Stat(p)
		if err != nil {
			continue
		}
		magic := fileMagic(p)
		if magic == "" {
			magic = "-"
		}
		w("  %-30s %10d B  %s  [%s]", label[p], info.Size(), info.ModTime().Format("02.01.2006 15:04"), magic)
	}
	if len(all) >= diagMaxFiles {
		w("  … (Liste bei %d Dateien abgeschnitten)", diagMaxFiles)
	}

	w("")
	w("Stammdaten: %d Mitarbeiter, %d Tätigkeiten, %d Aufträge (Pause=%q, Kommen=%q)",
		sync.Master.Persons, sync.Master.Activities, sync.Master.Orders, sync.Master.PauseActivity, sync.Master.WorkActivity)
	w("")
	w("== Inhalt der Datendateien ==")
	files, other := listFiles(path)
	if len(other) > 0 {
		var parts []string
		for k, v := range other {
			parts = append(parts, fmt.Sprintf("%s ×%d", k, v))
		}
		sort.Strings(parts)
		w("Nicht gelesene Typen: %s", strings.Join(parts, ", "))
	}
	master := loadMasterFrom(files)
	for _, f := range files {
		name, ok := label[f]
		if !ok {
			name = diagLabel(f, len(label)+1)
			label[f] = name
		}
		w("")
		w("-- %s", name)
		raw, err := os.ReadFile(f)
		if err != nil {
			w("  Lesefehler: %v", errNoPath(err))
			continue
		}
		if isSQLite(raw) {
			a.diagnoseSQLite(&b, f)
			continue
		}
		text := decodeText(raw)
		lines := strings.Split(text, "\n")
		w("  Zeichensatz: %s, Zeilen: %d", encodingName(raw), len(lines))
		kind := classifyOptiFile(f, text)
		if label, ok := master.files[f]; ok {
			w("  Art: %s, %d Einträge übernommen", label, master.rows[f])
			if kind == "config" {
				for i, l := range lines {
					if i >= diagMaxConfig {
						w("  | … (abgeschnitten)")
						break
					}
					if l = strings.TrimSpace(l); l != "" {
						w("  | %s", diagConfigLine(l))
					}
				}
			} else if rows := parseOffliste(text); len(rows) > 0 {
				w("  %d Datenzeilen mit %d Feldern (Inhalte ausgeblendet)", len(rows), len(rows[0]))
			}
			continue
		}
		if kind == "log" {
			w("  Art: OptiTime-Protokoll")
		} else {
			d := detectDelimiter(lines[0])
			w("  Trennzeichen: %q, Felder in Zeile 1: %d", string(d), len(strings.Split(lines[0], string(d))))
		}
		entries, format, perr := parseFile(f, master)
		if perr != nil {
			w("  Erkennung: %s – %v", format, perr)
			continue
		}
		persons, own := map[string]bool{}, 0
		for _, e := range entries {
			if e.person != "" {
				persons[normPerson(e.person)] = true
			}
			if entryMatches(e, sync.Identity) {
				own++
			}
		}
		w("  Erkennung: %s, %d Datensätze von %d Personen, davon %d eigene", format, len(entries), len(persons), own)
		shown := 0
		for _, e := range entries {
			if shown < 3 && entryMatches(e, sync.Identity) {
				w("  -> eigene: %s %s-%s Tätigkeit=%s (%s)", e.date, e.start, e.end, e.order, e.activity)
				shown++
			}
		}
	}
	return b.String()
}

// encodingName benennt den erkannten Zeichensatz einer Textdatei.
func encodingName(raw []byte) string {
	switch {
	case len(raw) >= 3 && raw[0] == 0xEF && raw[1] == 0xBB && raw[2] == 0xBF:
		return "utf-8 (BOM)"
	case len(raw) >= 2 && ((raw[0] == 0xFF && raw[1] == 0xFE) || (raw[0] == 0xFE && raw[1] == 0xFF)):
		return "utf-16"
	case !isValidUTF8(raw):
		return "windows-1252 (angenommen)"
	}
	return "utf-8"
}

func (a *App) diagnoseSQLite(b *strings.Builder, path string) {
	w := func(f string, args ...interface{}) { fmt.Fprintf(b, f+"\n", args...) }
	db, err := openSQLite(path)
	if err != nil {
		w("  SQLite: %v", err)
		return
	}
	w("  SQLite: Seitengröße %d, Seiten %d, Kodierung %d", db.pageSize, db.pages, db.encoding)
	if _, err := os.Stat(path + "-wal"); err == nil {
		w("  Hinweis: WAL-Datei vorhanden – neueste Buchungen können noch dort liegen.")
	}
	tables, err := db.tables()
	if err != nil {
		w("  Schema nicht lesbar: %v", err)
		return
	}
	for _, t := range tables {
		rows, rerr := db.rows(t, 0)
		w("  Tabelle %s (%d Zeilen): %s", t.Name, len(rows), strings.Join(t.Columns, ", "))
		if rerr != nil {
			w("    Lesefehler: %v", rerr)
		}
	}
}

// diagSystemFile: OptiTime-eigene Dateinamen, die keine Person nennen.
var diagSystemFile = regexp.MustCompile(`(?i)^(config\.ini|offliste.*|logger.*)$`)

// diagLabel nennt nur OptiTime-Systemdateien beim Namen. Andere Datei- und
// Ordnernamen können Namen Dritter enthalten (buchungen_e.fremd.csv).
func diagLabel(p string, n int) string {
	if base := filepath.Base(p); diagSystemFile.MatchString(base) {
		return base
	}
	return fmt.Sprintf("Datei %d%s", n, strings.ToLower(filepath.Ext(p)))
}

// errNoPath entfernt den Dateipfad aus Fehlermeldungen des Dateisystems.
func errNoPath(err error) error {
	var pe *fs.PathError
	if errors.As(err, &pe) {
		return pe.Err
	}
	return err
}

// diagConfigKeys: Schlüssel der config.ini, deren Werte die Diagnose zeigt.
// Alle anderen (Kennwörter, Server, Benutzer …) erscheinen ohne Wert.
var diagConfigKeys = map[string]bool{
	"KSTPAUSE": true, "DEFAULTKST": true, "SERVERZEIT": true, "LOKALZEIT": true,
	"RECONNECT": true, "BUCHLISTETAGE": true, "LOGGERSTUFE": true,
}

var diagKeyRe = regexp.MustCompile(`^[A-Za-z_][A-Za-z0-9_]*$`)

// diagConfigLine gibt eine Konfigurationszeile nur mit Schlüssel aus; den Wert
// nur bei Schlüsseln der Positivliste. Alles andere wird ganz ausgeblendet.
func diagConfigLine(line string) string {
	k, v, ok := strings.Cut(line, "=")
	if k = strings.TrimSpace(k); !ok || !diagKeyRe.MatchString(k) {
		return "<ausgeblendet>"
	}
	if diagConfigKeys[strings.ToUpper(k)] {
		return k + "=" + strings.TrimSpace(v)
	}
	return k + "=<ausgeblendet>"
}

func isValidUTF8(b []byte) bool {
	for i := 0; i < len(b); {
		c := b[i]
		if c < 0x80 {
			i++
			continue
		}
		var n int
		switch {
		case c&0xE0 == 0xC0:
			n = 1
		case c&0xF0 == 0xE0:
			n = 2
		case c&0xF8 == 0xF0:
			n = 3
		default:
			return false
		}
		if i+n >= len(b) {
			return false
		}
		for k := 1; k <= n; k++ {
			if b[i+k]&0xC0 != 0x80 {
				return false
			}
		}
		i += n + 1
	}
	return true
}
