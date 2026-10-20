package main

// Tests zu Issue #56: Diagnose ohne Werte, lokale API absichern, Zuordnung nur
// eigene Daten. Nur erfundene Testpersonen (Max Muster = eigene, Erika Fremd = fremde).

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

func datenschutzApp(t *testing.T, opti string) *App {
	t.Helper()
	base := t.TempDir()
	a := &App{explicit: opti, quit: make(chan struct{}), logFile: filepath.Join(base, "stempeluhr.log"), cfgPath: filepath.Join(base, "config.json")}
	a.id = Identity{Username: "m.muster", FullName: "Max Muster", ProfileDir: t.TempDir()}
	a.dataDir = base
	a.dataFile = filepath.Join(base, "m.muster", "data.json")
	a.state = State{Bookings: []Booking{}}
	a.runSync()
	return a
}

func TestDiagnoseKonfigNurErlaubteWerte(t *testing.T) {
	leaks := []string{
		" SMTPPW=geheim1", "SMTP_PASS=geheim2", "MAIL_PASSWD=geheim3", ";SMTPPW=geheim4",
		"SMTPPW: geheim5", "SMTP PW=geheim6", "smtp.password=geheim7", "APIKEY=geheim8",
		`  "password": "geheim9",`, "<Passwort>geheim10</Passwort>", "1626;Muster;geheim11", "SMTPPW\t=geheim12",
	}
	for _, l := range leaks {
		if got := diagConfigLine(l); strings.Contains(got, "geheim") {
			t.Errorf("Leck: %q -> %q", l, got)
		}
	}
	if got := diagConfigLine("SMTPPW=geheim"); got != "SMTPPW=<ausgeblendet>" {
		t.Errorf("Schlüssel ohne Wert erwartet: %q", got)
	}
	for _, ok := range []string{"KSTPAUSE=000007", "DEFAULTKST=000999", "LOGGERSTUFE=10"} {
		if got := diagConfigLine(ok); got != ok {
			t.Errorf("erlaubter Schlüssel: %q -> %q", ok, got)
		}
	}
}

func TestDiagnoseNurEigeneDaten(t *testing.T) {
	dir := optiFolder(t)
	// Stammdatenliste unter anderem Namen: Schutz darf nicht vom Dateinamen abhängen
	write(t, dir, "OfflisteMitarbeiter.txt", []byte(testOfflisteMa))
	write(t, dir, "logger_alt.txt", []byte(
		"24.08.2026 08:00:00 2/10[NB-TEST-01] - VerarbeiteBuchung: PNR=2001 KST=000999 BEG_STD=8 BEG_MIN=8\n"+
			"24.08.2026 08:00:00 2/10[NB-TEST-01] - Erzeuge_Buchung_Online Meldung: Fremd, Erika hat angestempelt.\n"))
	write(t, dir, "export.csv", []byte("Personalnummer;Name;Datum;Kommen;Gehen;Passwort\n2001;Fremd, Erika;2026-08-24;08:00;16:00;geheimCSV\n"))
	write(t, dir, "export.json", []byte(`[{"name": "Fremd, Erika", "datum": "2026-08-24", "von": "08:00", "bis": "16:00", "password": "geheimJSON"}]`))
	write(t, dir, "export.xml", []byte(`<Export><Buchung Mitarbeiter="Fremd, Erika"><Datum>24.08.2026</Datum><Von>08:00</Von><Bis>16:00</Bis></Buchung></Export>`))
	a := datenschutzApp(t, dir)
	rep := a.diagnose()
	for _, bad := range []string{"Fremd", "Erika", "PNR=2001", "2001;", "geheim", "GEHEIMPIN", "streng-geheim"} {
		if strings.Contains(rep, bad) {
			t.Errorf("Diagnose enthält %q", bad)
		}
	}
	for _, want := range []string{"KSTPAUSE=000007", "SMTPPW=<ausgeblendet>", "eigene"} {
		if !strings.Contains(rep, want) {
			t.Errorf("Diagnose ohne %q:\n%s", want, rep)
		}
	}
}

func TestDiagnoseSQLiteNurStruktur(t *testing.T) {
	db := makeTestDB(t)
	a := datenschutzApp(t, filepath.Dir(db))
	rep := a.diagnose()
	for _, bad := range []string{"Muster, Erika", "2001", "Gehen", "2026-0"} {
		if strings.Contains(rep, bad) {
			t.Errorf("SQLite-Diagnose enthält Wert %q:\n%s", bad, rep)
		}
	}
	if !strings.Contains(rep, "Tabelle Mitarbeiter (2 Zeilen): Nr, Name") {
		t.Errorf("Struktur fehlt:\n%s", rep)
	}
}

func TestAutoMatchNurVollerName(t *testing.T) {
	id := Identity{Username: "m.muster", FullName: "Max Muster", Keys: []string{"m.muster", "Max Muster"}}
	if m := autoMatch([]string{"Muster, Erika", "Fremd, Hans"}, id); m != "" {
		t.Errorf("Nachname allein ordnet zu: %q", m)
	}
	if m := autoMatch([]string{"Muster, Max", "Muster, Erika"}, id); m != "Muster, Max" {
		t.Errorf("voller Name nicht erkannt: %q", m)
	}
	if matchesIdentity("Muster-Max, Erika", Identity{Keys: []string{"Max Muster"}}) {
		t.Errorf("Obermenge des Namens passt auf fremde Person")
	}
	if matchesIdentity("Muster, M.", Identity{Keys: []string{"m.muster"}}) {
		t.Errorf("Anmeldename passt auf abgekürzten Namen")
	}
	if !matchesIdentity("Muster, Max", Identity{Keys: []string{"Max Muster"}}) {
		t.Errorf("eigener Name in anderer Reihenfolge nicht erkannt")
	}
}

func TestOhnePersonenspalteImProfilNichtZugeordnet(t *testing.T) {
	prof := t.TempDir()
	dir := filepath.Join(prof, "AppData", "Local", "OptiTime")
	write(t, dir, "team_export.csv", []byte("Datum;Kommen;Gehen\n2026-08-24;08:00;16:00\n2026-08-24;09:00;17:00\n"))
	write(t, dir, "muster.csv", []byte("Datum;Kommen;Gehen\n2026-08-24;08:00;16:00\n"))
	id := Identity{Username: "m.muster", FullName: "Max Muster", ProfileDir: prof, Keys: []string{"m.muster", "Max Muster"}}
	b, res := importOptiTime(dir, id)
	if len(b) > 0 || res.Unassigned != 2 {
		t.Errorf("Datei ohne Personenspalte übernommen: %d Buchungen, %d nicht zugeordnet", len(b), res.Unassigned)
	}
}

func TestInfoOhnePersonenliste(t *testing.T) {
	a := datenschutzApp(t, optiFolder(t))
	b, _ := json.Marshal(a.info())
	if strings.Contains(string(b), "Fremd") || strings.Contains(string(b), "Erika") {
		t.Errorf("/api/info enthält fremde Person: %s", b)
	}
	if a.sync.Persons != 2 {
		t.Errorf("Personenanzahl: %d", a.sync.Persons)
	}
}

func TestLokaleAPIAbgesichert(t *testing.T) {
	a := datenschutzApp(t, optiFolder(t))
	srv := httptest.NewServer(a.routes())
	defer srv.Close()
	do := func(method, path, ctype, origin, host, body string) int {
		req, _ := http.NewRequest(method, srv.URL+path, strings.NewReader(body))
		if ctype != "" {
			req.Header.Set("Content-Type", ctype)
		}
		if origin != "" {
			req.Header.Set("Origin", origin)
		}
		if host != "" {
			req.Host = host
		}
		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			t.Fatal(err)
		}
		resp.Body.Close()
		return resp.StatusCode
	}
	target := t.TempDir()
	body := `{"dataDir":"` + filepath.ToSlash(target) + `"}`
	if c := do("POST", "/api/datadir", "text/plain", "", "", body); c == 200 {
		t.Errorf("POST ohne JSON-Content-Type angenommen")
	}
	if c := do("POST", "/api/datadir", "application/json", "https://evil.example", "", body); c == 200 {
		t.Errorf("fremder Origin angenommen")
	}
	if _, err := os.Stat(filepath.Join(target, "m.muster", "data.json")); err == nil {
		t.Errorf("CSRF: Datenordner umgesetzt")
	}
	if c := do("GET", "/api/info", "", "", "evil.example", ""); c == 200 {
		t.Errorf("fremder Host angenommen (DNS-Rebinding)")
	}
	if c := do("POST", "/api/optitime/diagnose", "application/json", "", "evil.example:80", ""); c == 200 {
		t.Errorf("Diagnose über fremden Host")
	}
	if c := do("GET", "/api/optitime/diagnose", "", "", "", ""); c == 200 {
		t.Errorf("Diagnose per GET")
	}
	if c := do("GET", "/api/quit", "", "", "", ""); c == 200 {
		t.Errorf("/api/quit per GET")
	}
	// Eigene Oberfläche funktioniert weiter
	port := srv.URL[strings.LastIndex(srv.URL, ":"):]
	if c := do("GET", "/api/info", "", "", "localhost"+port, ""); c != 200 {
		t.Errorf("localhost abgewiesen: %d", c)
	}
	if c := do("POST", "/api/optitime/diagnose", "application/json", srv.URL, "", ""); c != 200 {
		t.Errorf("Diagnose aus eigener Oberfläche: %d", c)
	}
	if c := do("POST", "/api/datadir", "application/json; charset=utf-8", srv.URL, "", body); c != 200 {
		t.Errorf("eigener Datenordner-Wechsel abgewiesen: %d", c)
	}
}

func TestDateirechtePrivat(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("Unix-Rechte")
	}
	a := datenschutzApp(t, optiFolder(t))
	if err := a.saveState(); err != nil {
		t.Fatal(err)
	}
	a.handleDiagnose(httptest.NewRecorder(), httptest.NewRequest("POST", "/api/optitime/diagnose", nil))
	for p, want := range map[string]os.FileMode{
		a.dataFile: 0o600, filepath.Dir(a.dataFile): 0o700,
		filepath.Join(filepath.Dir(a.logFile), "diagnose.txt"): 0o600,
	} {
		st, err := os.Stat(p)
		if err != nil {
			t.Fatal(err)
		}
		if st.Mode().Perm() != want {
			t.Errorf("%s: Rechte %v, erwartet %v", filepath.Base(p), st.Mode().Perm(), want)
		}
	}
}
