-- =============================================================
-- FC Thun – Auswärtsfahrten UEFA: Teilnehmererfassung
-- Dieses Script im Supabase SQL-Editor ausführen.
-- =============================================================

create table if not exists public.teilnehmer (
  id            uuid primary key default gen_random_uuid(),
  gegner        text not null,
  name          text not null,
  vorname       text not null,
  geburtsdatum  date not null,
  erfasst_am    timestamptz not null default now()
);

-- Row Level Security aktivieren, OHNE Policies für anon/authenticated.
-- Dadurch ist die Tabelle über den öffentlichen anon-Key komplett gesperrt.
-- Sämtliche Zugriffe laufen serverseitig über den Service-Role-Key
-- (Next.js API-Routen), der RLS umgeht.
alter table public.teilnehmer enable row level security;

-- Index für die Filterung nach Spiel in der Verwaltung
create index if not exists teilnehmer_gegner_idx
  on public.teilnehmer (gegner);
