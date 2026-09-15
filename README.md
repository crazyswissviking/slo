# FC Thun – UEFA-Auswärtsfahrten: Registrierung & Ticketausgabe

Next.js-App (App Router, TypeScript) mit Supabase als Datenbank und Resend
für den E-Mail-Versand.

## Ablauf

1. **Zuhause registrieren**: Auf der Startseite (`/`) trägt jede Person ihre
   E-Mail-Adresse ein und erhält per Mail einen persönlichen Link
   (`/erfassen/[token]`), um Name, Vorname, Adresse, PLZ, Ort, Telefon und
   E-Mail selbst zu erfassen. Nach dem Speichern erscheint ein kurzer Code
   (z. B. `K7H2PQ`), den die Person vor Ort bereithält.
2. **Vor Ort** (`/vor-ort`, passwortgeschützt): Der SLO sucht die Person
   anhand des Codes, Namens oder der E-Mail-Adresse und trägt pro Spiel nur
   noch die gewünschte Anzahl Tickets ein. Die App berechnet den Betrag
   (Anzahl × hinterlegter Preis) zur Zahlung via TWINT vor Ort und markiert
   den Eintrag anschliessend als bezahlt.
3. **Verwaltung** (`/verwaltung`, passwortgeschützt): Übersicht aller
   Personen mit Erfassungsstatus, Tickets/Zahlungsstatus pro Spiel, CSV-
   Export sowie Bearbeitung der drei Ticketpreise.

Die drei Spiele sind fix in der Datenbank hinterlegt (siehe
`supabase/schema.sql`):

- 15.10.2026, 21:00 Uhr – FC Twente Enschede – FC Thun
- 26.11.2026, 18:45 Uhr – Ajax Amsterdam – FC Thun
- 17.12.2026, 21:00 Uhr – CSKA Sofia – FC Thun

## Architektur / Sicherheit

- Die Supabase-Tabellen `personen`, `spiele` und `tickets` haben **Row Level
  Security aktiviert, ohne Policies** – sie sind über den öffentlichen
  anon-Key komplett gesperrt.
- Sämtliche Datenbankzugriffe laufen **serverseitig** über Next.js-API-
  Routen mit dem Service-Role-Key. Keys landen nie im Browser.
- `POST /api/registrierung`: öffentlich – legt eine Person an (oder nutzt
  den bestehenden Eintrag zur E-Mail wieder) und verschickt den
  Erfassungslink.
- `GET/PATCH /api/personen/[token]`: öffentlich, aber nur mit dem
  unerratbaren Token aus der E-Mail nutzbar – das Token wirkt wie ein
  Passwort für die eigenen Daten.
- `GET /api/spiele`: öffentlich, liefert nur Spieldaten und Preise (keine
  Personendaten). `PATCH /api/spiele`: admin-geschützt.
- `GET/POST/PATCH /api/vor-ort`, `GET/DELETE /api/verwaltung`: geschützt
  über das Admin-Passwort (Umgebungsvariable `ADMIN_PASSWORD`, wird als
  Header `x-admin-password` mitgeschickt und nur serverseitig verglichen).

## Einrichtung

### 1. Supabase

1. Neues Projekt auf [supabase.com](https://supabase.com) erstellen
   (Region z. B. `eu-central-2` Zürich oder `eu-central-1` Frankfurt).
2. Im **SQL-Editor** den Inhalt von `supabase/schema.sql` ausführen.
   ⚠️ **Migration**: Das Script löscht die alten Tabellen `teilnehmer` und
   `einstellungen` aus der ersten Version der App unwiderruflich, bevor es
   die neue Struktur anlegt. Das ist so gewollt, wenn die alten Daten nicht
   mehr gebraucht werden.
3. Unter **Settings → API** die Project URL und den
   **service_role**-Key kopieren (nicht den anon-Key).

### 2. Resend (E-Mail-Versand)

1. Account auf [resend.com](https://resend.com) erstellen.
2. Eine Domain verifizieren (DNS-Einträge gemäss Resend-Anleitung) und
   einen API-Key erzeugen.
3. `EMAIL_FROM` auf eine Adresse dieser Domain setzen, z. B.
   `"FC Thun SLO <auswaertsfahrten@dein-domain.ch>"`.

### 3. Lokal starten

```bash
npm install
cp .env.local.example .env.local
# .env.local ausfüllen: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
# ADMIN_PASSWORD, RESEND_API_KEY, EMAIL_FROM
npm run dev
```

App: http://localhost:3000 · Vor-Ort: http://localhost:3000/vor-ort ·
Verwaltung: http://localhost:3000/verwaltung

### 4. Deployment auf Vercel

1. Repository zu GitHub pushen und in Vercel importieren.
2. Unter **Settings → Environment Variables** eintragen:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ADMIN_PASSWORD`
   - `RESEND_API_KEY`
   - `EMAIL_FROM`
3. Deployen. Fertig.

## Hinweise

- **CSV-Export** in der Verwaltung: Semikolon-getrennt mit BOM, öffnet
  direkt sauber in Excel. Enthält pro Spiel die Anzahl Tickets und den
  Zahlungsstatus sowie den Gesamtbetrag pro Person.
- **Ticketpreise** werden pro Spiel in der Verwaltung gepflegt. Ist für ein
  Spiel kein Preis hinterlegt, kann vor Ort für dieses Spiel noch keine
  Ticketanzahl gespeichert werden.
- Der **Betrag wird beim Speichern vor Ort eingefroren**: Ändert sich der
  Preis später in der Verwaltung, wirkt sich das nicht rückwirkend auf
  bereits erfasste Tickets aus. Wird die Anzahl Tickets für eine Person
  nachträglich verändert, wird der Bezahlt-Status bewusst zurückgesetzt.
- **Zahlung**: Die App zeigt den zu zahlenden Betrag nur an – die
  eigentliche TWINT-Zahlung läuft ausserhalb der App (z. B. TWINT-QR-Code
  des Vereins). Der SLO markiert die Zahlung danach manuell als erledigt.
- **Datenschutz (DSG)**: Es werden Personendaten (inkl. Adresse und
  Kontaktdaten) erfasst. Empfohlen: Supabase-Region in der Schweiz oder
  EU wählen, Einträge nach Abschluss der Auswärtsfahrten löschen, und die
  Teilnehmer beim Erfassen über den Zweck informieren.
- Das Admin-Passwort stark wählen – es schützt Vor-Ort-Erfassung und
  Verwaltung.
