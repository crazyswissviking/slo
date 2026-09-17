# FC Thun – UEFA-Auswärtsfahrten: Ticketerfassung & Verwaltung

Next.js-App (App Router, TypeScript) mit Supabase als Datenbank. Reines
SLO-Werkzeug: Der SLO erfasst Kundendaten und Tickets direkt vor Ort in
einem Formular – keine Selbst-Registrierung, kein E-Mail-Versand.

## Ablauf

1. **Startseite (`/`, passwortgeschützt)**: Der SLO trägt pro Spiel die
   gewünschte Anzahl Tickets ein, sieht die Gesamtsumme live mitlaufen und
   erfasst darunter die Angaben des Kunden (Vorname, Name, Adresse, PLZ,
   Ort, Telefon, E-Mail). Nach "Erfassen" erscheint der Gesamtbetrag zur
   Zahlung via TWINT sowie ein Button, um die Zahlung als erledigt zu
   markieren. Danach direkt "Neue Erfassung" für den nächsten Kunden.
2. **Verwaltung (`/verwaltung`, passwortgeschützt)**: Übersicht aller
   erfassten Personen mit Tickets/Zahlungsstatus pro Spiel, CSV-Export
   sowie Bearbeitung der drei Ticketpreise.

Die drei Spiele sind fix in der Datenbank hinterlegt (siehe
`supabase/schema.sql`):

- 15.10.2026, 21:00 Uhr – FC Twente Enschede – FC Thun
- 26.11.2026, 18:45 Uhr – Ajax Amsterdam – FC Thun
- 17.12.2026, 21:00 Uhr – CSKA Sofia – FC Thun

## Architektur / Sicherheit

- Die Supabase-Tabellen `personen`, `uefa_spiele` und `tickets` haben **Row
  Level Security aktiviert, ohne Policies** – sie sind über den
  öffentlichen anon-Key komplett gesperrt. (Die Tabelle heisst
  `uefa_spiele` statt `spiele`, da dasselbe Supabase-Projekt auch von der
  separaten SLO-Verwaltungs-App genutzt wird.)
- Sämtliche Datenbankzugriffe laufen **serverseitig** über Next.js-API-
  Routen mit dem Service-Role-Key. Keys landen nie im Browser.
- `GET /api/spiele`: öffentlich, liefert nur Spieldaten und Preise (keine
  Personendaten). `PATCH /api/spiele`: admin-geschützt.
- `POST/PATCH /api/erfassung`, `GET/DELETE /api/verwaltung`: geschützt über
  das Admin-Passwort (Umgebungsvariable `ADMIN_PASSWORD`, wird als Header
  `x-admin-password` mitgeschickt und nur serverseitig verglichen).

## Einrichtung

### 1. Supabase

1. Neues Projekt auf [supabase.com](https://supabase.com) erstellen
   (Region z. B. `eu-central-2` Zürich oder `eu-central-1` Frankfurt).
2. Im **SQL-Editor** den Inhalt von `supabase/schema.sql` ausführen.
3. Unter **Settings → API** die Project URL und den
   **service_role**-Key kopieren (nicht den anon-Key).

### 2. Lokal starten

```bash
npm install
cp .env.local.example .env.local
# .env.local ausfüllen: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_PASSWORD
npm run dev
```

App: http://localhost:3000 · Verwaltung: http://localhost:3000/verwaltung

### 3. Deployment auf Vercel

1. Repository zu GitHub pushen und in Vercel importieren.
2. Unter **Settings → Environment Variables** eintragen:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ADMIN_PASSWORD`
3. Deployen.

## Hinweise

- **CSV-Export** in der Verwaltung: Semikolon-getrennt mit BOM, öffnet
  direkt sauber in Excel. Enthält pro Spiel die Anzahl Tickets und den
  Zahlungsstatus sowie den Gesamtbetrag pro Person.
- **Ticketpreise** werden pro Spiel in der Verwaltung gepflegt. Ist für ein
  Spiel kein Preis hinterlegt, kann auf der Startseite für dieses Spiel
  keine Ticketanzahl erfasst werden.
- **Zahlung**: Die App zeigt den zu zahlenden Betrag nur an – die
  eigentliche TWINT-Zahlung läuft ausserhalb der App (z. B. TWINT-QR-Code
  des Vereins). Der SLO markiert die Zahlung danach manuell als erledigt.
- Es gibt aktuell **keine Suche/Bearbeitung** bereits erfasster Personen –
  jede Erfassung ist ein eigener, abgeschlossener Vorgang. Korrekturen
  laufen über Löschen + Neuerfassen in der Verwaltung.
- **Datenschutz (DSG)**: Es werden Personendaten (inkl. Adresse und
  Kontaktdaten) erfasst. Empfohlen: Supabase-Region in der Schweiz oder
  EU wählen, Einträge nach Abschluss der Auswärtsfahrten löschen, und die
  Kunden beim Erfassen über den Zweck informieren.
- Das Admin-Passwort stark wählen – es schützt Ticketerfassung und
  Verwaltung.
