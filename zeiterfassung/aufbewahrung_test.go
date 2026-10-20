package main

// Tests zu Issue #56, Teil 2: Protokoll-Rotation, Aufbewahrung, alte Datendatei
// nach Ordnerwechsel, Ordnerrechte, --user nur mit Personalnummer.
// Nur erfundene Testpersonen (Max Muster).

import (
	"encoding/json"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
	"time"
)

func TestProtokollRotation(t *testing.T) {
	dir := t.TempDir()
	logf := filepath.Join(dir, "stempeluhr.log")
	write(t, dir, "stempeluhr.log.2", []byte("ganz alt"))
	write(t, dir, "stempeluhr.log.1", []byte("alt"))
	write(t, dir, "stempeluhr.log", make([]byte, logMaxBytes+1))
	aufraeumen(dir, time.Now())
	if _, err := os.Stat(logf); err == nil {
		t.Errorf("großes Protokoll nicht rotiert")
	}
	if b, _ := os.ReadFile(logf + ".2"); string(b) != "alt" {
		t.Errorf("stempeluhr.log.2 = %q, erwartet bisheriges .1", b)
	}
	st, err := os.Stat(logf + ".1")
	if err != nil || st.Size() != logMaxBytes+1 {
		t.Fatalf("stempeluhr.log.1 fehlt: %v", err)
	}
	if runtime.GOOS != "windows" && st.Mode().Perm() != 0o600 {
		t.Errorf("Rechte %v", st.Mode().Perm())
	}
	if _, err := os.Stat(logf + ".3"); err == nil {
		t.Errorf("mehr als zwei alte Protokolle")
	}
	// kleines Protokoll bleibt
	write(t, dir, "stempeluhr.log", []byte("klein"))
	aufraeumen(dir, time.Now())
	if _, err := os.Stat(logf); err != nil {
		t.Errorf("kleines Protokoll rotiert")
	}
}

func TestAufbewahrungsfristen(t *testing.T) {
	dir := t.TempDir()
	now := time.Now()
	alt := func(name string, age time.Duration) string {
		p := write(t, dir, name, []byte("x"))
		if err := os.Chtimes(p, now.Add(-age), now.Add(-age)); err != nil {
			t.Fatal(err)
		}
		return p
	}
	diagAlt := alt("diagnose.txt", diagnoseAufbewahrung+time.Hour)
	logAlt := alt("stempeluhr.log.2", protokollAufbewahrung+time.Hour)
	logNeu := alt("stempeluhr.log.1", 24*time.Hour)
	aktuell := alt("stempeluhr.log", protokollAufbewahrung+time.Hour) // laufendes Protokoll bleibt
	aufraeumen(dir, now)
	for _, p := range []string{diagAlt, logAlt} {
		if _, err := os.Stat(p); err == nil {
			t.Errorf("%s nicht gelöscht", filepath.Base(p))
		}
	}
	for _, p := range []string{logNeu, aktuell} {
		if _, err := os.Stat(p); err != nil {
			t.Errorf("%s gelöscht", filepath.Base(p))
		}
	}
	diagNeu := alt("diagnose.txt", 24*time.Hour)
	aufraeumen(dir, now)
	if _, err := os.Stat(diagNeu); err != nil {
		t.Errorf("frische Diagnose gelöscht")
	}
}

func TestOrdnerwechselEntferntAlteDatei(t *testing.T) {
	a := datenschutzApp(t, optiFolder(t))
	a.state.Bookings = []Booking{{ID: "b1", Date: "2026-09-01", Start: "08:00", Kind: kindWork}}
	if err := a.saveState(); err != nil {
		t.Fatal(err)
	}
	old := a.dataFile
	target := t.TempDir()
	if _, err := a.switchDataDir(target); err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(old); err == nil {
		t.Errorf("alte data.json nach geprüfter Kopie nicht entfernt")
	}
	b, err := os.ReadFile(filepath.Join(target, "m.muster", "data.json"))
	var s State
	if err != nil || json.Unmarshal(b, &s) != nil || len(s.Bookings) != 1 {
		t.Fatalf("neue Datei: %v %s", err, b)
	}
}

func TestOrdnerwechselBehaeltUnlesbareAlteDatei(t *testing.T) {
	a := datenschutzApp(t, optiFolder(t))
	write(t, filepath.Dir(a.dataFile), "data.json", []byte("{kaputt"))
	old := a.dataFile
	if _, err := a.switchDataDir(t.TempDir()); err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(old); err != nil {
		t.Errorf("nicht geprüfte alte Datei gelöscht")
	}
}

func TestOrdnerwechselFehlschlagLoeschtNichts(t *testing.T) {
	if runtime.GOOS == "windows" || os.Getuid() == 0 {
		t.Skip("Schreibschutz per Unix-Rechte")
	}
	a := datenschutzApp(t, optiFolder(t))
	if err := a.saveState(); err != nil {
		t.Fatal(err)
	}
	ro := t.TempDir()
	_ = os.Chmod(ro, 0o500)
	defer os.Chmod(ro, 0o700)
	if _, err := a.switchDataDir(ro); err == nil {
		t.Fatal("Wechsel in schreibgeschützten Ordner gelungen")
	}
	if _, err := os.Stat(a.dataFile); err != nil {
		t.Errorf("alte Datei nach Fehlschlag weg")
	}
}

func TestBestehendeOrdnerWerdenPrivat(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("Unix-Rechte")
	}
	a := datenschutzApp(t, optiFolder(t))
	dir := filepath.Dir(a.dataFile)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		t.Fatal(err)
	}
	_ = os.Chmod(dir, 0o755)
	_ = os.Chmod(filepath.Dir(a.cfgPath), 0o755)
	if err := a.saveState(); err != nil {
		t.Fatal(err)
	}
	if err := a.saveConfig(); err != nil {
		t.Fatal(err)
	}
	for _, d := range []string{dir, filepath.Dir(a.cfgPath)} {
		if st, _ := os.Stat(d); st.Mode().Perm() != 0o700 {
			t.Errorf("%s: Rechte %v, erwartet 0700", d, st.Mode().Perm())
		}
	}
}

func TestUserOverrideNurMitPersonalnummer(t *testing.T) {
	a := datenschutzApp(t, optiFolder(t))
	a.id.Source = "parameter"
	a.state.Bookings = []Booking{}
	a.runSync()
	if len(a.state.Bookings) != 0 || len(a.sync.Errors) == 0 || !strings.Contains(a.sync.Errors[0], "Personalnummer") {
		t.Fatalf("Abgleich ohne bestätigte Personalnummer: %d Buchungen, Fehler %v", len(a.state.Bookings), a.sync.Errors)
	}
	a.state.Profile.Personalnummer = "1001"
	a.runSync()
	for _, e := range a.sync.Errors {
		if strings.Contains(e, "Personalnummer bestätigen") {
			t.Errorf("Sperre trotz Personalnummer: %v", a.sync.Errors)
		}
	}
}
