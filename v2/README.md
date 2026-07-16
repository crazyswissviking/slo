# FC Thun – Auswärtsfahrten UEFA: Teilnehmererfassung

Kleine Next.js-App (App Router, TypeScript) mit Supabase als Datenbank.
Teilnehmer erfassen gegnerische Mannschaft, Name, Vorname und Geburtsdatum,
bestätigen ihre Angaben in einem Popup und die Daten werden gespeichert –
ohne weitere Bestätigung. Der SLO verwaltet die Listen unter `/verwaltung`.

## Architektur / Sicherheit

- Die Supabase-Tabelle `teilnehmer` hat **Row Level Security aktiviert, ohne
  Policies** – sie ist über den öffentlichen anon-Key komplett gesperrt.
- Sämtliche Datenbankzugriffe laufen **serverseitig** über Next.js-API-Routen
  mit dem Service-Role-Key. Keys landen nie im Browser.
- `POST /api/teilnehmer`: öffentlich, nur Einfügen, mit serverseitiger
  Validierung.
- `GET/DELETE /api/verwaltung`: geschützt über das Admin-Passwort
  (Umgebungsvariable `ADMIN_PASSWORD`, wird als Header `x-admin-password`
  mitgeschickt und nur serverseitig verglichen).

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
3. Deployen. Fertig.

## Hinweise

- **CSV-Export** in der Verwaltung: Semikolon-getrennt mit BOM, öffnet
  direkt sauber in Excel. Pro Spiel filterbar oder als Gesamtliste.
- Das Feld «Gegnerische Mannschaft» bleibt nach dem Speichern stehen,
  damit mehrere Personen am selben Gerät nacheinander erfasst werden
  können, ohne das Spiel neu einzutippen.
- **Datenschutz (DSG):** Es werden Personendaten erfasst. Empfohlen:
  Supabase-Region in der Schweiz wählen, Einträge nach der Fahrt löschen,
  und die Teilnehmer beim Erfassen über den Zweck informieren (Text im
  Ticket-Kopf kann in `app/page.tsx` angepasst werden).
- Das Admin-Passwort stark wählen – es schützt die gesamte Liste.
