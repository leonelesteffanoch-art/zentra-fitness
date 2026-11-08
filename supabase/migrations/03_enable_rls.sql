-- =====================================================================
-- ZENTRA FITNESS - Activación de RLS (Row Level Security) para Producción
-- Ejecutar en: Supabase > SQL Editor > New query
-- Protege los datos para que solo el personal autenticado del gimnasio
-- pueda ver/operar el panel, manteniendo públicas la Landing y /api/health.
-- =====================================================================

-- 1. Activar RLS en todas las tablas principales
alter table public.gyms             enable row level security;
alter table public.perfiles         enable row level security;
alter table public.socios           enable row level security;
alter table public.planes           enable row level security;
alter table public.membresias       enable row level security;
alter table public.asistencias      enable row level security;
alter table public.productos        enable row level security;
alter table public.ventas_productos enable row level security;
alter table public.turnos_caja      enable row level security;
alter table public.movimientos_caja enable row level security;

-- 2. Políticas de lectura pública (Landing Page y Keep-Alive /api/health)
drop policy if exists "gyms_lectura_publica" on public.gyms;
create policy "gyms_lectura_publica" on public.gyms
  for select to anon, authenticated
  using (activo = true);

drop policy if exists "planes_lectura_publica" on public.planes;
create policy "planes_lectura_publica" on public.planes
  for select to anon, authenticated
  using (activo = true and visible_landing = true);

-- 3. Políticas para Perfiles de Staff
drop policy if exists "perfiles_lectura_propia_o_gym" on public.perfiles;
create policy "perfiles_lectura_propia_o_gym" on public.perfiles
  for select to authenticated
  using (id = auth.uid() or gym_id = public.mi_gym_id());

-- 4. Políticas para Socios (Staff del gimnasio lee, crea y edita)
drop policy if exists "socios_staff_all" on public.socios;
create policy "socios_staff_all" on public.socios
  for all to authenticated
  using (gym_id = public.mi_gym_id())
  with check (gym_id = public.mi_gym_id());

-- 5. Políticas para Planes (Staff lee todos los de su gym; solo Admin crea/edita)
drop policy if exists "planes_staff_select" on public.planes;
create policy "planes_staff_select" on public.planes
  for select to authenticated
  using (gym_id = public.mi_gym_id());

drop policy if exists "planes_admin_write" on public.planes;
create policy "planes_admin_write" on public.planes
  for all to authenticated
  using (gym_id = public.mi_gym_id() and public.mi_rol() = 'admin')
  with check (gym_id = public.mi_gym_id() and public.mi_rol() = 'admin');

-- 6. Políticas para Productos del POS (Staff lee; solo Admin crea/edita catálogo)
drop policy if exists "productos_staff_select" on public.productos;
create policy "productos_staff_select" on public.productos
  for select to authenticated
  using (gym_id = public.mi_gym_id());

drop policy if exists "productos_admin_write" on public.productos;
create policy "productos_admin_write" on public.productos
  for all to authenticated
  using (gym_id = public.mi_gym_id() and public.mi_rol() = 'admin')
  with check (gym_id = public.mi_gym_id() and public.mi_rol() = 'admin');

-- 7. Políticas para Membresías, Asistencias, Ventas, Turnos y Movimientos
--    (Las escrituras ocurren vía funciones RPC SECURITY DEFINER ya validadas;
--     el SELECT permite a las vistas security_invoker mostrar datos al staff)
drop policy if exists "membresias_staff_select" on public.membresias;
create policy "membresias_staff_select" on public.membresias
  for select to authenticated
  using (gym_id = public.mi_gym_id());

drop policy if exists "asistencias_staff_select" on public.asistencias;
create policy "asistencias_staff_select" on public.asistencias
  for select to authenticated
  using (gym_id = public.mi_gym_id());

drop policy if exists "ventas_staff_select" on public.ventas_productos;
create policy "ventas_staff_select" on public.ventas_productos
  for select to authenticated
  using (gym_id = public.mi_gym_id());

drop policy if exists "turnos_staff_select" on public.turnos_caja;
create policy "turnos_staff_select" on public.turnos_caja
  for select to authenticated
  using (gym_id = public.mi_gym_id());

drop policy if exists "movimientos_staff_select" on public.movimientos_caja;
create policy "movimientos_staff_select" on public.movimientos_caja
  for select to authenticated
  using (gym_id = public.mi_gym_id());
