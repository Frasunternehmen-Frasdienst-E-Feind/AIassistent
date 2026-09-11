# Android-App (APK) aus der Fuhrpark-Web-App erzeugen

Die App ist eine **Progressive Web App (PWA)**. Auf dem Handy kann sie direkt aus Chrome
installiert werden („Zum Startbildschirm hinzufügen“). Für eine verteilbare **APK-Datei**
wird die PWA in eine Android-Hülle verpackt (Trusted Web Activity, TWA). Die App bleibt dabei
mit dem Server verbunden, alle Daten liegen weiterhin in der SQLite-Datenbank auf dem Server.

## 1. Voraussetzung: öffentlich gültige HTTPS-Adresse

Eine TWA funktioniert **nur** mit einer HTTPS-Adresse, deren Zertifikat Android vertraut
(z. B. Let's Encrypt). Ein selbstsigniertes Zertifikat oder eine interne Firmen-CA reicht
nicht: die App startet dann mit sichtbarem Chrome-Adressbalken, oder gar nicht.

Empfehlung: Domain wie `fuhrpark.fraesdienst-feind.de` auf einen Reverse-Proxy (nginx,
Caddy, Traefik) mit Let's Encrypt legen und den Zugriff per VPN oder IP-Allowlist auf das
Firmennetz begrenzen. **Bitte mit der IT abstimmen, bevor Schritt 3 beginnt.**

## 2. Vorprüfung auf dem Server

Nach dem Deployment müssen diese drei Adressen erreichbar sein:

```bash
curl -i https://<domain>/manifest.webmanifest        # 200, application/manifest+json
curl -i https://<domain>/sw.js                        # 200, Service-Worker-Allowed: /
curl -i https://<domain>/.well-known/assetlinks.json  # 200, JSON mit package_name
```

Solange `TWA_SHA256_FINGERPRINT` nicht gesetzt ist, steht in `assetlinks.json` ein
Platzhalter. Das ist für Schritt 3 in Ordnung, muss aber vor Schritt 4 ersetzt werden.

## 3. APK mit PWABuilder erzeugen (ohne Android Studio)

1. <https://www.pwabuilder.com> öffnen, die HTTPS-Adresse der App eingeben, **Start** klicken.
2. Der Report prüft Manifest, Service Worker und HTTPS. Alle drei sollten grün sein.
3. **Package for stores → Android** wählen.
4. Einstellungen:
   - Package ID: `de.feind.fuhrpark` (muss zu `TWA_PACKAGE_NAME` auf dem Server passen)
   - App name: `Fahrzeugmanagement Feind`, Short name: `Fuhrpark`
   - Signing key: **Create new** (PWABuilder erzeugt einen Schlüssel)
5. **Generate** klicken und das ZIP herunterladen. Es enthält:
   - `*.apk` zum direkten Installieren (Sideload / MDM)
   - `*.aab` für den Play Store (nur nötig, wenn die App dort erscheinen soll)
   - `signing.keystore` + Passwörter in `signing-key-info.txt`
   - `assetlinks.json` mit dem SHA-256-Fingerprint des Schlüssels

**Wichtig:** `signing.keystore` und die Passwörter sicher ablegen (Passwortmanager der IT).
Ohne diesen Schlüssel kann später keine aktualisierte APK installiert werden.

## 4. Fingerprint auf dem Server hinterlegen

Den Wert `sha256_cert_fingerprints` aus der heruntergeladenen `assetlinks.json` (oder per
`keytool -list -v -keystore signing.keystore`) als Umgebungsvariable setzen und den Dienst
neu starten:

```bash
export TWA_PACKAGE_NAME="de.feind.fuhrpark"
export TWA_SHA256_FINGERPRINT="AB:CD:EF:...:12"      # mehrere Werte kommagetrennt
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Prüfen: `curl https://<domain>/.well-known/assetlinks.json` zeigt jetzt den Fingerprint.
Google bietet dafür auch einen Tester:
`https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://<domain>&relation=delegate_permission/common.handle_all_urls`

## 5. APK installieren und prüfen

- APK per E-Mail, Dateifreigabe oder MDM auf das Handy bringen und installieren
  („Unbekannte Quellen“ einmalig erlauben).
- Erfolgskriterium: Die App startet **ohne** Chrome-Adressbalken im Vollbild mit dem
  Fuhrpark-Icon. Ist der Adressbalken sichtbar, stimmt Fingerprint oder Package-ID nicht
  mit `assetlinks.json` überein.

## Alternative: Bubblewrap-Kommandozeile

Wer lieber lokal baut (Node.js vorhanden, JDK und Android-SDK lädt Bubblewrap selbst):

```bash
npx @bubblewrap/cli init --manifest https://<domain>/manifest.webmanifest
npx @bubblewrap/cli build
```

Ergebnis: `app-release-signed.apk` und `assetlinks.json` im Projektordner; Schritt 4 gilt
genauso.

## Updates

- Änderungen am Web-Frontend sind sofort in der App sichtbar (die APK ist nur die Hülle).
  Damit installierte Geräte die neue App-Shell laden, in `app/static/sw.js` die
  `CACHE_VERSION` erhöhen.
- Eine neue APK ist nur nötig, wenn sich Package-ID, App-Name, Icon oder Start-URL ändern.
  Dann mit **demselben** Schlüssel signieren.

## Fehlersuche

| Symptom | Ursache / Abhilfe |
|---|---|
| Adressbalken in der App sichtbar | Fingerprint oder Package-ID passt nicht zu `assetlinks.json`; Zertifikat nicht öffentlich gültig |
| PWABuilder meldet „Manifest not found“ | Route `/manifest.webmanifest` hinter dem Proxy nicht erreichbar oder Content-Type falsch |
| Chrome bietet „App installieren“ nicht an | Kein HTTPS (außer `localhost`), Service Worker nicht registriert, Icons nicht ladbar |
| Alte Oberfläche nach Update | `CACHE_VERSION` in `sw.js` erhöhen, App einmal schließen und neu öffnen |
