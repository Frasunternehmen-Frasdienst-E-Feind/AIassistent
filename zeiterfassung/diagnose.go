package main

// diagnose.go – Diagnosebericht über den OptiTime-Ordner: welche Dateien liegen dort,
// welche Formate wurden erkannt, wie sehen die ersten Zeilen bzw. Tabellen aus.
// Der Bericht enthält Auszüge der eigenen Daten und ist zum Weitergeben an den
// Entwickler gedacht.

import (
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"
)

const (
	diagMaxFiles = 400
	diagMaxLines = 6
	diagMaxCell  = 60
)

func trunc(s string, n int) string {
	s = strings.ReplaceAll(strings.ReplaceAll(s, "\r", ""), "\n", "⏎")
	if len(s) > n {
		return s[:n] + "…"
	}
	return s
}

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
			w("  Fehler: %s: %v", p, err)
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
	for _, p := range all {
		rel, _ := filepath.Rel(path, p)
		info, err := os.Stat(p)
		if err != nil {
			continue
		}
		magic := fileMagic(p)
		if magic == "" {
			magic = "-"
		}
		w("  %-60s %10d B  %s  [%s]", rel, info.Size(), info.ModTime().Format("02.01.2006 15:04"), magic)
	}
	if len(all) >= diagMaxFiles {
		w("  … (Liste bei %d Dateien abgeschnitten)", diagMaxFiles)
	}

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
	for _, f := range files {
		rel, _ := filepath.Rel(path, f)
		w("")
		w("-- %s", rel)
		raw, err := os.ReadFile(f)
		if err != nil {
			w("  Lesefehler: %v", err)
			continue
		}
		if isSQLite(raw) {
			a.diagnoseSQLite(&b, f)
			continue
		}
		enc := "utf-8"
		switch {
		case len(raw) >= 3 && raw[0] == 0xEF && raw[1] == 0xBB && raw[2] == 0xBF:
			enc = "utf-8 (BOM)"
		case len(raw) >= 2 && ((raw[0] == 0xFF && raw[1] == 0xFE) || (raw[0] == 0xFE && raw[1] == 0xFF)):
			enc = "utf-16"
		case !isValidUTF8(raw):
			enc = "windows-1252 (angenommen)"
		}
		text := decodeText(raw)
		lines := strings.Split(text, "\n")
		w("  Zeichensatz: %s, Zeilen: %d, Trennzeichen: %q", enc, len(lines), string(detectDelimiter(lines[0])))
		for i := 0; i < len(lines) && i < diagMaxLines; i++ {
			w("  %2d| %s", i+1, trunc(lines[i], 200))
		}
		entries, format, perr := parseFile(f)
		if perr != nil {
			w("  Erkennung: %s – %v", format, perr)
		} else {
			w("  Erkennung: %s, %d Datensätze", format, len(entries))
			for i := 0; i < len(entries) && i < 3; i++ {
				e := entries[i]
				w("  -> %s %s-%s person=%q event=%q order=%q activity=%q", e.date, e.start, e.end, e.person, e.event, e.order, e.activity)
			}
		}
	}
	return b.String()
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
		w("    %s", trunc(t.SQL, 300))
		if rerr != nil {
			w("    Lesefehler: %v", rerr)
		}
		for i := 0; i < len(rows) && i < 3; i++ {
			var parts []string
			for _, c := range t.Columns {
				parts = append(parts, c+"="+trunc(rows[i][c], diagMaxCell))
			}
			w("    %s", strings.Join(parts, " | "))
		}
		if len(rows) > 3 {
			last := rows[len(rows)-1]
			var parts []string
			for _, c := range t.Columns {
				parts = append(parts, c+"="+trunc(last[c], diagMaxCell))
			}
			w("    … letzte: %s", strings.Join(parts, " | "))
		}
	}
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
