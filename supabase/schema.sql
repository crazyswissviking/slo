-- =============================================================
-- FC Thun – Auswärtsfahrten UEFA: Teilnehmer- & Ticketerfassung
-- Dieses Script im Supabase SQL-Editor ausführen.
--
-- ACHTUNG MIGRATION: Dieses Script ersetzt die alte Struktur
-- komplett (Tabellen "teilnehmer" und "einstellungen" aus der
-- ersten Version der App). Die alten Daten werden dabei
-- unwiderruflich gelöscht. Das ist so gewollt – die alten
-- Ausweisnummer-Einträge werden nicht mehr gebraucht.
-- =============================================================

drop table if exists public.teilnehmer cascade;
drop table if exists public.einstellungen cascade;
drop table if exists public.tickets cascade;
drop table if exists public.personen cascade;
drop table if exists public.spiele cascade;

-- -------------------------------------------------------------
-- Personen: Stammdaten, einmal zentral erfasst (zuhause per
-- Link oder direkt vor Ort). Der Token macht den Erfassungslink
-- eindeutig und unerratbar, der Code ist die kurze, gut
-- vorlesbare Referenz für die Vor-Ort-Suche.
-- -------------------------------------------------------------
create table public.personen (
  id             uuid primary key default gen_random_uuid(),
  token          text not null unique,
  code           text not null unique,
  email          text not null,
  name           text not null default '',
  vorname        text not null default '',
  adresse        text not null default '',
  plz            text not null default '',
  ort            text not null default '',
  tel            text not null default '',
  daten_erfasst  boolean not null default false,
  angefordert_am timestamptz not null default now(),
  erfasst_am     timestamptz
);

create index personen_email_idx on public.personen (lower(email));

-- -------------------------------------------------------------
-- Spiele: die 3 UEFA-Auswärtsspiele. Preis pro Ticket ist in
-- der Verwaltung editierbar (pro Spiel unterschiedlich).
-- -------------------------------------------------------------
create table public.spiele (
  id                text primary key,
  gegner            text not null,
  heimteam          text not null default 'FC Thun',
  datum             timestamptz not null,
  preis_pro_ticket  numeric(10, 2),
  reihenfolge       int not null default 0
);

insert into public.spiele (id, gegner, heimteam, datum, reihenfolge) values
  ('twente', 'FC Twente Enschede', 'FC Thun', '2026-10-15T21:00:00+02:00', 1),
  ('ajax',   'Ajax Amsterdam',     'FC Thun', '2026-11-26T18:45:00+01:00', 2),
  ('cska',   'CSKA Sofia',         'FC Thun', '2026-12-17T21:00:00+01:00', 3)
on conflict (id) do nothing;

-- -------------------------------------------------------------
-- Tickets: Anzahl + Zahlung pro Person und Spiel. Der Betrag
-- wird beim Speichern vor Ort eingefroren (Preisänderungen
-- danach wirken sich nicht rückwirkend auf bereits erfasste
-- Tickets aus).
-- -------------------------------------------------------------
create table public.tickets (
  id             uuid primary key default gen_random_uuid(),
  person_id      uuid not null references public.personen (id) on delete cascade,
  spiel_id       text not null references public.spiele (id) on delete cascade,
  anzahl         int not null default 0 check (anzahl >= 0),
  betrag         numeric(10, 2) not null default 0,
  bezahlt        boolean not null default false,
  bezahlt_am     timestamptz,
  erstellt_am    timestamptz not null default now(),
  aktualisiert_am timestamptz not null default now(),
  unique (person_id, spiel_id)
);

create index tickets_spiel_idx on public.tickets (spiel_id);

-- Row Level Security aktivieren, OHNE Policies für anon/authenticated.
-- Dadurch sind die Tabellen über den öffentlichen anon-Key komplett
-- gesperrt. Sämtliche Zugriffe laufen serverseitig über die
-- Next.js-API-Routen mit dem Service-Role-Key, der RLS umgeht.
alter table public.personen enable row level security;
alter table public.spiele   enable row level security;
alter table public.tickets  enable row level security;
