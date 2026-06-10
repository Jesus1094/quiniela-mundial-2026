-- ============================================================================
-- Quiniela Mundial 2026 — Esquema inicial
-- Tablas, RLS, función calculate_scores() y trigger.
-- ============================================================================

-- Fecha de corte: 11 de junio de 2026, 11:00 AM America/Mexico_City (UTC-6) == 17:00 UTC.
-- Se centraliza en una función inmutable para usarla en políticas RLS.
create or replace function public.cutoff_ts()
returns timestamptz
language sql
immutable
as $$
  select timestamptz '2026-06-11 17:00:00+00';
$$;

-- ----------------------------------------------------------------------------
-- Tablas
-- ----------------------------------------------------------------------------

create table if not exists public.participants (
  id              uuid primary key default gen_random_uuid(),
  nombre          text not null,
  email           text unique not null,
  pago_confirmado boolean not null default false,
  created_at      timestamptz not null default now()
);

create table if not exists public.predictions (
  id                   uuid primary key default gen_random_uuid(),
  participant_id       uuid not null references public.participants(id) on delete cascade,
  tipo                 text not null,
  equipo_seleccionado  text not null,
  created_at           timestamptz not null default now(),
  unique (participant_id, tipo)
);

create table if not exists public.results (
  id             uuid primary key default gen_random_uuid(),
  tipo           text not null unique,
  equipo_ganador text not null,
  updated_at     timestamptz not null default now()
);

create table if not exists public.scores (
  participant_id uuid primary key references public.participants(id) on delete cascade,
  puntos_grupos  int not null default 0,
  puntos_fases   int not null default 0,
  puntos_comodin int not null default 0,
  total          int generated always as (puntos_grupos + puntos_fases + puntos_comodin) stored,
  updated_at     timestamptz not null default now()
);

create index if not exists idx_predictions_participant on public.predictions(participant_id);
create index if not exists idx_predictions_tipo on public.predictions(tipo);

-- ----------------------------------------------------------------------------
-- Función de cálculo de puntajes
-- Recalcula desde cero el puntaje de TODOS los participantes a partir de
-- predictions vs results. Se dispara tras cualquier cambio en results.
-- ----------------------------------------------------------------------------

create or replace function public.calculate_scores()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.scores as s (participant_id, puntos_grupos, puntos_fases, puntos_comodin, updated_at)
  select
    p.id,
    -- a) Grupos: 3 pts por cada grupo (tipo like 'grupo_%') acertado.
    coalesce((
      select count(*) * 3
      from public.predictions pr
      join public.results r
        on r.tipo = pr.tipo
       and r.equipo_ganador = pr.equipo_seleccionado
      where pr.participant_id = p.id
        and pr.tipo like 'grupo\_%'
    ), 0) as puntos_grupos,
    -- b) Fases finales: 5/8/15/25 según tipo acertado.
    coalesce((
      select sum(
        case pr.tipo
          when 'cuarto'     then 5
          when 'tercero'    then 8
          when 'subcampeon' then 15
          when 'campeon'    then 25
          else 0
        end)
      from public.predictions pr
      join public.results r
        on r.tipo = pr.tipo
       and r.equipo_ganador = pr.equipo_seleccionado
      where pr.participant_id = p.id
        and pr.tipo in ('cuarto', 'tercero', 'subcampeon', 'campeon')
    ), 0) as puntos_fases,
    -- c) Comodín: 10 pts si el equipo elegido llegó a cuartos o más,
    --    es decir aparece como ganador en algún result de tipo
    --    cuarto/tercero/subcampeon/campeon.
    coalesce((
      select 10
      from public.predictions pr
      where pr.participant_id = p.id
        and pr.tipo = 'comodin'
        and exists (
          select 1
          from public.results r
          where r.tipo in ('cuarto', 'tercero', 'subcampeon', 'campeon')
            and r.equipo_ganador = pr.equipo_seleccionado
        )
      limit 1
    ), 0) as puntos_comodin,
    now()
  from public.participants p
  on conflict (participant_id) do update
    set puntos_grupos  = excluded.puntos_grupos,
        puntos_fases   = excluded.puntos_fases,
        puntos_comodin = excluded.puntos_comodin,
        updated_at     = now();

  return null;
end;
$$;

drop trigger if exists trg_calculate_scores on public.results;
create trigger trg_calculate_scores
  after insert or update on public.results
  for each statement
  execute function public.calculate_scores();

-- Mantener una fila en scores en cuanto se registra un participante,
-- para que aparezca en la tabla aunque aún no haya resultados.
create or replace function public.init_score()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.scores (participant_id)
  values (new.id)
  on conflict (participant_id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_init_score on public.participants;
create trigger trg_init_score
  after insert on public.participants
  for each row
  execute function public.init_score();

-- ----------------------------------------------------------------------------
-- Row Level Security
-- ----------------------------------------------------------------------------

alter table public.participants enable row level security;
alter table public.predictions  enable row level security;
alter table public.results      enable row level security;
alter table public.scores       enable row level security;

-- SELECT público en todas las tablas.
drop policy if exists sel_participants on public.participants;
create policy sel_participants on public.participants for select using (true);

drop policy if exists sel_predictions on public.predictions;
create policy sel_predictions on public.predictions for select using (true);

drop policy if exists sel_results on public.results;
create policy sel_results on public.results for select using (true);

drop policy if exists sel_scores on public.scores;
create policy sel_scores on public.scores for select using (true);

-- INSERT público en participants, sólo antes del corte.
drop policy if exists ins_participants on public.participants;
create policy ins_participants on public.participants
  for insert to anon, authenticated
  with check (now() < public.cutoff_ts());

-- INSERT público en predictions, sólo antes del corte.
drop policy if exists ins_predictions on public.predictions;
create policy ins_predictions on public.predictions
  for insert to anon, authenticated
  with check (now() < public.cutoff_ts());

-- UPDATE público en predictions, sólo antes del corte (para el UPSERT / re-guardado).
drop policy if exists upd_predictions on public.predictions;
create policy upd_predictions on public.predictions
  for update to anon, authenticated
  using (now() < public.cutoff_ts())
  with check (now() < public.cutoff_ts());

-- IMPORTANTE: no se crean políticas de INSERT/UPDATE/DELETE para results,
-- ni de UPDATE para participants/scores con el rol anon. Esas operaciones
-- se ejecutan exclusivamente con la service_role key (bypassa RLS) desde
-- las Server Actions del panel /admin.

-- ----------------------------------------------------------------------------
-- Realtime: publicar cambios de scores (y results para el badge EN VIVO).
-- ----------------------------------------------------------------------------
alter publication supabase_realtime add table public.scores;
alter publication supabase_realtime add table public.results;
