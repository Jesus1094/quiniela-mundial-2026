-- ============================================================================
-- Quiniela Mundial 2026 — Módulo de pronósticos por partido (fase de grupos)
-- Tablas matches / match_predictions, puntaje 5 (marcador exacto) / 2 (resultado),
-- corte por partido (kickoff - 30 min), RLS y recálculo de scores.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Tablas
-- ----------------------------------------------------------------------------

create table if not exists public.matches (
  id                 uuid primary key default gen_random_uuid(),
  grupo              text not null,                 -- 'A'..'L'
  equipo_local       text not null,
  equipo_visitante   text not null,
  kickoff            timestamptz not null,          -- hora de inicio (UTC)
  marcador_local     int,                           -- null hasta que admin lo carga
  marcador_visitante int,
  orden              int not null default 0,         -- para ordenar el calendario
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  check (marcador_local is null or marcador_local >= 0),
  check (marcador_visitante is null or marcador_visitante >= 0)
);

create table if not exists public.match_predictions (
  id               uuid primary key default gen_random_uuid(),
  participant_id   uuid not null references public.participants(id) on delete cascade,
  match_id         uuid not null references public.matches(id) on delete cascade,
  pred_local       int not null check (pred_local >= 0),
  pred_visitante   int not null check (pred_visitante >= 0),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (participant_id, match_id)
);

create index if not exists idx_mp_participant on public.match_predictions(participant_id);
create index if not exists idx_mp_match on public.match_predictions(match_id);
create index if not exists idx_matches_kickoff on public.matches(kickoff);

-- ----------------------------------------------------------------------------
-- scores: agregar bucket de puntos por partido y reconstruir 'total'.
-- ----------------------------------------------------------------------------
alter table public.scores add column if not exists puntos_partidos int not null default 0;

alter table public.scores drop column if exists total;
alter table public.scores
  add column total int generated always as
    (puntos_grupos + puntos_fases + puntos_comodin + puntos_partidos) stored;

-- ----------------------------------------------------------------------------
-- Recalcular scores incluyendo puntos por partido.
--   5 pts: marcador exacto (también acierta el resultado).
--   2 pts: solo acierta el resultado (local gana / empate / visitante gana).
--   0 pts: falla.
-- ----------------------------------------------------------------------------
create or replace function public.calculate_scores()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.scores as s
    (participant_id, puntos_grupos, puntos_fases, puntos_comodin, puntos_partidos, updated_at)
  select
    p.id,
    coalesce((
      select count(*) * 3
      from public.predictions pr
      join public.results r
        on r.tipo = pr.tipo and r.equipo_ganador = pr.equipo_seleccionado
      where pr.participant_id = p.id and pr.tipo like 'grupo\_%'
    ), 0) as puntos_grupos,
    coalesce((
      select sum(case pr.tipo
        when 'cuarto' then 5 when 'tercero' then 8
        when 'subcampeon' then 15 when 'campeon' then 25 else 0 end)
      from public.predictions pr
      join public.results r
        on r.tipo = pr.tipo and r.equipo_ganador = pr.equipo_seleccionado
      where pr.participant_id = p.id
        and pr.tipo in ('cuarto','tercero','subcampeon','campeon')
    ), 0) as puntos_fases,
    coalesce((
      select 10
      from public.predictions pr
      where pr.participant_id = p.id and pr.tipo = 'comodin'
        and exists (
          select 1 from public.results r
          where r.tipo in ('cuarto','tercero','subcampeon','campeon')
            and r.equipo_ganador = pr.equipo_seleccionado
        )
      limit 1
    ), 0) as puntos_comodin,
    coalesce((
      select sum(
        case
          when mp.pred_local = m.marcador_local
           and mp.pred_visitante = m.marcador_visitante then 5
          when sign((mp.pred_local - mp.pred_visitante)::numeric)
             = sign((m.marcador_local - m.marcador_visitante)::numeric) then 2
          else 0
        end)
      from public.match_predictions mp
      join public.matches m on m.id = mp.match_id
      where mp.participant_id = p.id
        and m.marcador_local is not null
        and m.marcador_visitante is not null
    ), 0) as puntos_partidos,
    now()
  from public.participants p
  on conflict (participant_id) do update
    set puntos_grupos   = excluded.puntos_grupos,
        puntos_fases    = excluded.puntos_fases,
        puntos_comodin  = excluded.puntos_comodin,
        puntos_partidos = excluded.puntos_partidos,
        updated_at      = now();
  return null;
end;
$$;

revoke execute on function public.calculate_scores() from public, anon, authenticated;

-- Recalcular también cuando cambian los marcadores de partidos.
drop trigger if exists trg_calc_on_matches on public.matches;
create trigger trg_calc_on_matches
  after insert or update on public.matches
  for each statement
  execute function public.calculate_scores();

-- ----------------------------------------------------------------------------
-- Row Level Security
-- ----------------------------------------------------------------------------
alter table public.matches           enable row level security;
alter table public.match_predictions enable row level security;

-- matches: lectura pública; escritura solo service_role (sin política para anon).
drop policy if exists sel_matches on public.matches;
create policy sel_matches on public.matches for select using (true);

-- match_predictions: lectura pública.
drop policy if exists sel_mp on public.match_predictions;
create policy sel_mp on public.match_predictions for select using (true);

-- Insert/Update permitido hasta 30 minutos antes del kickoff de ESE partido.
drop policy if exists ins_mp on public.match_predictions;
create policy ins_mp on public.match_predictions
  for insert to anon, authenticated
  with check (exists (
    select 1 from public.matches m
    where m.id = match_id and now() < m.kickoff - interval '30 minutes'
  ));

drop policy if exists upd_mp on public.match_predictions;
create policy upd_mp on public.match_predictions
  for update to anon, authenticated
  using (exists (
    select 1 from public.matches m
    where m.id = match_id and now() < m.kickoff - interval '30 minutes'
  ))
  with check (exists (
    select 1 from public.matches m
    where m.id = match_id and now() < m.kickoff - interval '30 minutes'
  ));

-- Relajar el registro de participantes: permitir unirse mientras siga abierta
-- la fase de grupos (hasta el último kickoff), no solo hasta el corte global.
drop policy if exists ins_participants on public.participants;
create policy ins_participants on public.participants
  for insert to anon, authenticated
  with check (
    now() < coalesce((select max(kickoff) from public.matches), public.cutoff_ts())
  );

-- ----------------------------------------------------------------------------
-- Realtime
-- ----------------------------------------------------------------------------
alter publication supabase_realtime add table public.matches;
