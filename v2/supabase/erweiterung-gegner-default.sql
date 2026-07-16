-- =============================================================
-- Erweiterung: Standard-Gegner in der Verwaltung setzen
-- Dieses Script im Supabase SQL-Editor ausführen.
-- =============================================================

create table if not exists public.einstellungen (
  schluessel  text primary key,
  wert        text not null default '',
  geaendert_am timestamptz not null default now()
);

-- Gleiche Absicherung wie bei teilnehmer: RLS an, keine Policies.
-- Zugriff nur serverseitig über den Service-Role-Key.
alter table public.einstellungen enable row level security;

-- Startwert anlegen (leer = kein Standard gesetzt, Feld frei eingebbar)
insert into public.einstellungen (schluessel, wert)
values ('aktueller_gegner', '')
on conflict (schluessel) do nothing;
