-- =====================================================================
-- ZENTRA FITNESS - Columna updated_at automática en tabla socios
-- Ejecutar en: Supabase > SQL Editor > New query
-- Permite medir cuántos socios completaron o actualizaron sus datos cada semana.
-- =====================================================================

alter table public.socios
  add column if not exists updated_at timestamptz not null default now();

create or replace function public.set_socios_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_socios_updated_at on public.socios;

create trigger trg_socios_updated_at
  before update on public.socios
  for each row
  execute function public.set_socios_updated_at();
