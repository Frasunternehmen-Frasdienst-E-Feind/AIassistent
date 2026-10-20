package main

// aufbewahrung.go – Protokoll-Rotation, Löschfristen und private Ordnerrechte
// (Issue #56). Läuft beim Start, bevor das Protokoll geöffnet wird.

import (
	"fmt"
	"os"
	"path/filepath"
	"time"
)

const (
	// logMaxBytes: ab dieser Größe wird stempeluhr.log beim Start rotiert.
	logMaxBytes = 1 << 20
	// logAlteDateien: höchstens so viele rotierte Protokolle (.1, .2) bleiben.
	logAlteDateien = 2
	// diagnoseAufbewahrung: diagnose.txt ist zum einmaligen Weitergeben gedacht.
	diagnoseAufbewahrung = 7 * 24 * time.Hour
	// protokollAufbewahrung: rotierte Protokolle dienen nur der Fehlersuche.
	protokollAufbewahrung = 30 * 24 * time.Hour
)

// aufraeumen rotiert ein zu großes stempeluhr.log und löscht Dateien, deren
// Frist abgelaufen ist. Fehler werden ignoriert: Aufräumen darf den Start nie
// verhindern.
func aufraeumen(dir string, now time.Time) {
	logf := filepath.Join(dir, "stempeluhr.log")
	if st, err := os.Stat(logf); err == nil && st.Size() > logMaxBytes {
		_ = os.Remove(fmt.Sprintf("%s.%d", logf, logAlteDateien))
		for i := logAlteDateien - 1; i >= 1; i-- {
			_ = os.Rename(fmt.Sprintf("%s.%d", logf, i), fmt.Sprintf("%s.%d", logf, i+1))
		}
		if os.Rename(logf, logf+".1") == nil {
			_ = os.Chmod(logf+".1", 0o600)
		}
	}
	loeschenWennAelter := func(p string, frist time.Duration) {
		if st, err := os.Stat(p); err == nil && now.Sub(st.ModTime()) > frist {
			_ = os.Remove(p)
		}
	}
	loeschenWennAelter(filepath.Join(dir, "diagnose.txt"), diagnoseAufbewahrung)
	for i := 1; i <= logAlteDateien; i++ {
		loeschenWennAelter(fmt.Sprintf("%s.%d", logf, i), protokollAufbewahrung)
	}
}

// privateDir legt einen eigenen Ordner mit 0700 an und engt die Rechte eines
// bestehenden Ordners darauf ein. Unter Windows wirkt Chmod nur auf das
// Schreibschutz-Attribut; dort gelten die Rechte des Benutzerprofils.
func privateDir(dir string) error {
	if err := os.MkdirAll(dir, 0o700); err != nil {
		return err
	}
	if st, err := os.Stat(dir); err == nil && st.Mode().Perm()&0o077 != 0 {
		return os.Chmod(dir, 0o700)
	}
	return nil
}
