-- =====================================================================
-- ZENTRA FITNESS - Limpieza de datos de prueba y función de reinicio
-- Ejecutar en: Supabase > SQL Editor > New query
--
-- ¿Qué borra?
--   - Todos los movimientos de caja (ingresos y egresos de prueba)
--   - Todas las ventas de productos del POS
--   - Todos los turnos de caja (incluida la caja abierta actualmente)
--   - Todas las asistencias (check-ins de prueba)
--   - Todas las membresías vendidas de prueba
--   - Todos los socios registrados de prueba
--
-- ¿Qué CONSERVA intacto?
--   - Tu gimnasio (Zentra Fitness)
--   - Tus usuarios de personal y administrador (tabla perfiles + auth.users)
--   - Tu catálogo de planes y precios (Semanal, Mensual, Trimestral, etc.)
--   - Tu catálogo de productos del POS (Agua, Rehidratante, Pase diario, etc.)
-- =====================================================================

-- 1. Limpieza inmediata de todas las tablas operativas de prueba
truncate table
  public.movimientos_caja,
  public.ventas_productos,
  public.asistencias,
  public.membresias,
  public.turnos_caja,
  public.socios
restart identity cascade;

-- 2. Permitir que el administrador pueda reiniciar datos de prueba desde el
--    botón del panel de Administración sin romper la auditoría normal
create or replace function public.bloquear_delete() returns trigger
language plpgsql as $$
begin
  if current_setting('zentra.allow_reset', true) = 'on' then
    return old;
  end if;
  raise exception 'DELETE prohibido en %. Use anulacion (estado=ANULADO + motivo).', tg_table_name;
end $$;

create or replace function public.reiniciar_datos_operativos()
returns void language plpgsql security definer set search_path = public as $$
declare v_gym uuid := mi_gym_id();
begin
  if v_gym is null or mi_rol() <> 'admin' then
    raise exception 'Solo el administrador puede reiniciar los datos de prueba';
  end if;

  perform set_config('zentra.allow_reset', 'on', true);

  delete from movimientos_caja where gym_id = v_gym;
  delete from ventas_productos where gym_id = v_gym;
  delete from asistencias      where gym_id = v_gym;
  delete from membresias       where gym_id = v_gym;
  delete from turnos_caja      where gym_id = v_gym;
  delete from socios           where gym_id = v_gym;
end $$;
