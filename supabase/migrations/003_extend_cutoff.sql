-- ============================================================================
-- Extender el corte de predicciones de torneo a las 12:30 PM CDMX (18:30 UTC),
-- que coincide con 30 minutos antes del primer partido (México vs Sudáfrica,
-- 13:00 CDMX). Antes era 11:00 AM CDMX (17:00 UTC).
-- ============================================================================
create or replace function public.cutoff_ts()
returns timestamptz
language sql
immutable
set search_path = public, pg_temp
as $$
  select timestamptz '2026-06-11 18:30:00+00';
$$;
