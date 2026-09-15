# FC Thun – UEFA-Auswärtsfahrten: Registrierung & Ticketausgabe

Next.js-App (App Router, TypeScript) mit Supabase als Datenbank. Kein
E-Mail-Versand nötig – die Registrierung läuft über einen QR-Code.

## Ablauf

1. **Registrieren**: Ein QR-Code (Seite `/qr`, für Flyer/Plakate/Social
   Media) führt zu `/registrieren`. Das legt sofort eine neue, leere Person
   an und leitet direkt auf deren persönliches Erfassungsformular
   (`/erfassen/[token]`) weiter – ganz ohne Login oder Mailversand. Dort
   trägt die Person Name, Vorname, Adresse, PLZ, Ort, Telefon und E-Mail
   ein. Der Link lässt sich als Lesezeichen speichern, um die Angaben
   später (z. B. zuhause) zu ergänzen. Nach dem Speichern erscheint ein
   kurzer Code (z. B. `K7H2PQ`), den die Person vor Ort bereithält.
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
- `GET /registrieren`: öffentlich – legt eine neue Person an (Token + Code)
  und leitet auf `/erfassen/[token]` weiter. Jeder Aufruf (= jeder Scan)
  erzeugt einen neuen Eintrag; unvollständige Mehrfach-Scans lassen sich in
  der Verwaltung löschen.
- `GET/PATCH /api/personen/[token]`: öffentlich, aber nur mit dem
  unerratbaren Token aus dem Link nutzbar – das Token wirkt wie ein
  Passwort für die eigenen Daten.
- `GET /api/spiele`: öffentlich, liefert nur Spieldaten und Preise (keine
  Personendaten). `PATCH /api/spiele`: admin-geschützt.
- `GET/POST/PATCH /api/vor-ort`, `GET/DELETE /api/verwaltung`: geschützt
  über das Admin-Passwort (Umgebungsvariable `ADMIN_PASSWORD`, wird als
  Header `x-admin-password` mitgeschickt und nur serverseitig verglichen).
- `/qr`: erzeugt den QR-Code serverseitig für die aktuelle Domain (kein
  externer Dienst nötig) und bietet ihn als PNG zum Download an.

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

### 2. Lokal starten

```bash
npm install
cp .env.local.example .env.local
# .env.local ausfüllen: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_PASSWORD
npm run dev
```

App: http://localhost:3000 · QR-Code: http://localhost:3000/qr ·
Vor-Ort: http://localhost:3000/vor-ort ·
Verwaltung: http://localhost:3000/verwaltung

### 3. Deployment auf Vercel

1. Repository zu GitHub pushen und in Vercel importieren.
2. Unter **Settings → Environment Variables** eintragen:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ADMIN_PASSWORD`
3. Deployen.
4. Nach dem Deployment `/qr` öffnen und den QR-Code herunterladen/drucken –
   er zeigt automatisch die richtige (produktive) Domain an.

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
- **Mehrfach-Scans**: Da jeder Scan des QR-Codes eine neue, leere Person
  anlegt, können unvollständige Dubletten entstehen (z. B. wenn jemand den
  Link nicht speichert und später erneut scannt). Diese lassen sich in der
  Verwaltung erkennen (kein Name/keine Adresse) und löschen.
- **Datenschutz (DSG)**: Es werden Personendaten (inkl. Adresse und
  Kontaktdaten) erfasst. Empfohlen: Supabase-Region in der Schweiz oder
  EU wählen, Einträge nach Abschluss der Auswärtsfahrten löschen, und die
  Teilnehmer beim Erfassen über den Zweck informieren.
- Das Admin-Passwort stark wählen – es schützt Vor-Ort-Erfassung und
  Verwaltung.
