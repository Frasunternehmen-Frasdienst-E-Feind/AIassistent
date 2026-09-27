# vendor/ – Drittanbieter-Bibliotheken

Diese Dateien werden von `build.mjs` in `../gps-dashboard.html` eingebettet. Sie stammen
unverändert aus den offiziellen npm-Paketen (`npm pack`), damit die Herkunft nachvollziehbar
und der Build reproduzierbar ist.

| Datei | Paket / Version | Lizenz |
|---|---|---|
| `leaflet.min.js`, `leaflet.min.css` | leaflet@1.9.4 | BSD-2-Clause |
| `papaparse.min.js` | papaparse@5.4.1 | MIT |
| `xlsx.full.min.js` | xlsx@0.18.5 | Apache-2.0 |

Aktualisieren:

```bash
npm pack leaflet@<version> papaparse@<version> xlsx@<version>
# dist-Dateien aus den entpackten Tarballs hierher kopieren, dann:
node ../build.mjs
```
