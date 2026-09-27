# EMS Terminal

Separate Vite-Webseite im Terminal-Look, visuell inspiriert von https://oat.zone/. Vier Vorlagen des EMS-Zeiterfassungssystems, vollständig lokal im Browser. Keine externen Fonts, Bilder, Tracker oder Server-API.

## Starten

Unter Windows `Starten.cmd` doppelklicken. Es startet Vite und öffnet http://127.0.0.1:5174/ automatisch. Der Cursor steht bereits im Eingabefeld. Das Terminalfenster während der Nutzung geöffnet lassen.

Eine portable Node.js-Version liegt in `.tools/`. Alternativ mit installiertem Node.js 24 LTS:

```sh
npm ci
npm run dev
npm test
npm run build
npm run preview
```

Nicht per Doppelklick auf index.html starten. Vite benötigt einen lokalen Server. Der Produktionsbuild liegt in `dist/` und funktioniert auf statischem Hosting, inklusive GitHub Pages. Relative Asset-Pfade unterstützen Repository-Unterordner. Der mitgelieferte Workflow veröffentlicht bei Pushes auf `main`, nachdem im Repository Settings → Pages → Source auf GitHub Actions gesetzt wurde.

## Bedienung

1. `standard`, `abteilungsarbeit`, `ausbildung` oder `luftrettung` eingeben (auch 1–4). Alternativ ein Menü anklicken.
2. Gefragte Daten eingeben und jeweils Enter drücken. Bereits gespeicherte Werte werden angeboten; Enter übernimmt sie.
3. Der Discord-Text entsteht rechts. `/kopieren` oder der Kopierbutton übernimmt ihn.
4. `/austragen` setzt die aktuelle Endzeit, umschließt den Text mit `~~` und kopiert ihn automatisch. `/end HH:MM` setzt eine gewünschte Endzeit und kopiert ebenfalls automatisch. Wiederholtes Austragen verändert eine vorhandene Endzeit nicht und kopiert den Text erneut. Blockiert der Browser die Zwischenablage, wird der Text zum manuellen Kopieren markiert.

Weitere Befehle:

| Befehl | Wirkung |
| --- | --- |
| `/beginn 18:00` | Startzeit des aktuellen Eintrags ändern, auch nach Neuladen oder Austragen |
| `/end 20:30` | Nachträglich austragen oder die Endzeit korrigieren; speichert die Zeit und ergänzt `~~` für Discord |
| `/eintragen` | Austragen rückgängig machen, Startzeit behalten |
| `/bearbeiten` | Alle Angaben erneut durchgehen |
| `/zurueck` | Eine Frage zurück |
| `/menue` | Zur Abteilungsauswahl |
| `/standard`, `/abteilungsarbeit`, `/ausbildung`, `/luftrettung` | Direkt zur entsprechenden Abteilung wechseln, auch während einer Frage |
| `/neu` | In der aktuellen Abteilung einen neuen Dienst beginnen; bisherige persönliche Daten als Vorschlag behalten |
| `/leeren` | Nur sichtbaren Verlauf leeren |
| `/hilfe` | Alle Befehle anzeigen |
| `/loeschen` | Anleitung zum Löschen aller lokalen Daten |
| `/loeschen bestaetigen` | Lokale Daten und Dienste löschen |

Esc fokussiert die Eingabe. Zeiten haben das Format HH:MM und verwenden die lokale Gerätezeit. Über Mitternacht ist möglich; es werden keine Dauer und kein Datum berechnet.

## Speicherung

LocalStorage-Schlüssel: `ems-terminal.session.v1`. Gespeichert werden Angaben, aktive Abteilung, aktuelle Frage sowie Start- und Endzeit pro Abteilung. Ein Neuladen führt den aktuellen Eintrag fort; bei der allerersten Nutzung wird zuerst die Abteilung abgefragt. `/neu` ersetzt den Dienst der aktuellen Abteilung. Es gibt kein Archiv.

Die Daten bleiben unverschlüsselt im Browser, bis sie gelöscht werden. Keine Cookies und keine Übertragung der Angaben. Lokaler Speicher ist an die Browseradresse gebunden: Immer dieselbe Adresse verwenden. Die Daten der bisherigen Webseite werden nicht automatisch aus einer anderen Adresse übernommen. Bei blockiertem Speicher zeigt die Seite einen Hinweis.

## Dateien

- `src/session.js`: Vorlagen, Befehle, Zustand und Validierung
- `src/main.js`: Terminalbedienung, Speicherung, Fokus und Kopieren
- `src/style.css`: responsive Terminaloberfläche
- `tests/session.test.js`: Abläufe, Vorlagen, Speicherung und Zeitkorrekturen

Für GitHub `.tools/`, `node_modules/` und `dist/` nicht hochladen; `.gitignore` schließt diese aus.
