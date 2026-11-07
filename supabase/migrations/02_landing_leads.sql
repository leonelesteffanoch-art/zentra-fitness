-- =====================================================================
-- ZENTRA FITNESS - Migración Landing Pública y Prospectos (Leads)
-- Ejecutar en Supabase > SQL Editor si se desea guardar prospectos o
-- gestionar disciplinas/entrenadores desde la BD.
-- (La Landing también funciona sin ejecutar esto gracias a sus datos de respaldo)
-- =====================================================================

-- 1. Disciplinas / Clases
create table if not exists public.clases (
  id          uuid primary key default gen_random_uuid(),
  gym_id      uuid not null references public.gyms(id),
  orden       integer not null default 1,
  nombre      text not null,
  subtitulo   text,
  descripcion text not null,
  intensidad  text not null default 'Alta',
  duracion    text not null default '60 min',
  activo      boolean not null default true,
  created_at  timestamptz not null default now()
);
create index if not exists idx_clases_gym_id on public.clases(gym_id, orden);

-- 2. Entrenadores
create table if not exists public.entrenadores (
  id             uuid primary key default gen_random_uuid(),
  gym_id         uuid not null references public.gyms(id),
  orden          integer not null default 1,
  nombre         text not null,
  especialidad   text not null,
  certificacion  text not null,
  activo         boolean not null default true,
  created_at     timestamptz not null default now()
);
create index if not exists idx_entrenadores_gym_id on public.entrenadores(gym_id, orden);

-- 3. Prospectos / Leads (Formulario de contacto de la Landing)
create table if not exists public.leads (
  id                uuid primary key default gen_random_uuid(),
  gym_id            uuid not null references public.gyms(id),
  nombre            text not null,
  telefono          text not null,
  objetivo          text not null,
  horario_preferido text not null,
  estado            text not null default 'NUEVO' check (estado in ('NUEVO','CONTACTADO','INSCRITO','DESCARTADO')),
  created_at        timestamptz not null default now()
);
create index if not exists idx_leads_gym_id on public.leads(gym_id, created_at desc);

-- Fase dev: RLS desactivado igual que el resto del esquema inicial
alter table public.clases       disable row level security;
alter table public.entrenadores disable row level security;
alter table public.leads        disable row level security;
