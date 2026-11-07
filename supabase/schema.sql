-- =====================================================================
-- ZENTRA FITNESS - Esquema inicial (Supabase / PostgreSQL)
-- Ejecutar completo en: Supabase > SQL Editor > New query
-- Multi-tenant (gym_id) | Soft delete en finanzas | RLS DESACTIVADO (fase dev)
-- Zona horaria de negocio: America/Lima
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- 0. UTILIDADES
-- ---------------------------------------------------------------------
create or replace function public.hoy_lima() returns date
language sql stable as $$ select (now() at time zone 'America/Lima')::date $$;

-- ---------------------------------------------------------------------
-- 1. TABLAS
-- ---------------------------------------------------------------------

-- 1.1 Gimnasios (tenant)
create table public.gyms (
  id            uuid primary key default gen_random_uuid(),
  nombre        text not null,
  slug          text unique,
  direccion     text,
  telefono      text,
  whatsapp      text,
  email         text,
  redes         jsonb not null default '{}'::jsonb,  -- {"instagram":"","facebook":"","tiktok":""}
  descripcion   text,
  fotos         text[] not null default '{}',        -- URLs en Storage (landing)
  activo        boolean not null default true,
  created_at    timestamptz not null default now()
);

-- 1.2 Perfiles de staff (1 a 1 con auth.users). El ROL vive aqui.
create table public.perfiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  gym_id        uuid not null references public.gyms(id),
  nombre        text not null,
  rol           text not null check (rol in ('admin','recepcionista')),
  activo        boolean not null default true,
  created_at    timestamptz not null default now()
);
create index idx_perfiles_gym_id on public.perfiles(gym_id);

-- 1.3 Socios
create table public.socios (
  id               uuid primary key default gen_random_uuid(),
  gym_id           uuid not null references public.gyms(id),
  dni              text not null,
  nombres          text not null,
  apellidos        text not null,
  telefono         text,
  email            text,
  fecha_nacimiento date,
  foto_url         text,
  observaciones    text,
  activo           boolean not null default true,
  created_by       uuid references public.perfiles(id),
  created_at       timestamptz not null default now(),
  unique (gym_id, dni)
);
create index idx_socios_gym_id on public.socios(gym_id);
create index idx_socios_dni    on public.socios(dni);
create index idx_socios_gym_apellidos on public.socios(gym_id, lower(apellidos), lower(nombres));

-- 1.4 Planes
create table public.planes (
  id               uuid primary key default gen_random_uuid(),
  gym_id           uuid not null references public.gyms(id),
  nombre           text not null,
  descripcion      text,
  duracion_dias    integer not null check (duracion_dias > 0),
  precio           numeric(10,2) not null check (precio >= 0),
  permite_congelar boolean not null default false,
  max_dias_congelar integer check (max_dias_congelar is null or max_dias_congelar >= 0), -- NULL = sin tope
  visible_landing  boolean not null default true,
  activo           boolean not null default true,
  created_at       timestamptz not null default now()
);
create index idx_planes_gym_id on public.planes(gym_id);

-- 1.5 Turnos de caja (apertura / cierre MANUAL)
create table public.turnos_caja (
  id                uuid primary key default gen_random_uuid(),
  gym_id            uuid not null references public.gyms(id),
  turno             text not null check (turno in ('Mañana','Tarde')),
  fecha             date not null default public.hoy_lima(),
  estado            text not null default 'ABIERTO' check (estado in ('ABIERTO','CERRADO')),
  abierto_por       uuid not null references public.perfiles(id),
  abierto_at        timestamptz not null default now(),
  fondo_inicial     numeric(10,2) not null check (fondo_inicial >= 0),
  -- Cierre
  cerrado_por       uuid references public.perfiles(id),
  cerrado_at        timestamptz,
  efectivo_esperado numeric(10,2),   -- arqueo teorico calculado por el sistema
  efectivo_real     numeric(10,2),   -- confirmado por el recepcionista
  diferencia        numeric(10,2),   -- real - esperado
  observaciones     text,
  check ((estado = 'ABIERTO' and cerrado_at is null)
      or (estado = 'CERRADO' and cerrado_at is not null and efectivo_real is not null))
);
create index idx_turnos_gym_id    on public.turnos_caja(gym_id);
create index idx_turnos_gym_fecha on public.turnos_caja(gym_id, fecha desc);
-- Solo 1 turno ABIERTO a la vez por gimnasio
create unique index uq_turno_abierto_por_gym on public.turnos_caja(gym_id) where estado = 'ABIERTO';

-- 1.6 Membresias
create table public.membresias (
  id               uuid primary key default gen_random_uuid(),
  gym_id           uuid not null references public.gyms(id),
  socio_id         uuid not null references public.socios(id),
  plan_id          uuid not null references public.planes(id),
  fecha_inicio     date not null,
  fecha_fin        date not null,
  precio_total     numeric(10,2) not null check (precio_total >= 0), -- snapshot del precio al vender
  dias_congelados  integer not null default 0 check (dias_congelados >= 0),
  estado           text not null default 'ACTIVO' check (estado in ('ACTIVO','ANULADO')),
  anulado_por      uuid references public.perfiles(id),
  anulado_at       timestamptz,
  motivo_anulacion text,
  created_by       uuid references public.perfiles(id),
  created_at       timestamptz not null default now(),
  check (fecha_fin >= fecha_inicio),
  check (estado = 'ACTIVO' or (anulado_por is not null and motivo_anulacion is not null))
);
create index idx_membresias_gym_id    on public.membresias(gym_id);
create index idx_membresias_socio_fin on public.membresias(socio_id, fecha_fin desc);

-- 1.7 Asistencias (1 check-in por socio por dia)
create table public.asistencias (
  id             uuid primary key default gen_random_uuid(),
  gym_id         uuid not null references public.gyms(id),
  socio_id       uuid not null references public.socios(id),
  membresia_id   uuid references public.membresias(id),
  fecha          date not null default public.hoy_lima(),
  hora           timestamptz not null default now(),
  semaforo       text not null check (semaforo in ('VERDE','AMBAR','ROJO')),
  registrado_por uuid references public.perfiles(id),
  unique (socio_id, fecha)
);
create index idx_asistencias_gym_id     on public.asistencias(gym_id);
create index idx_asistencias_socio_fecha on public.asistencias(socio_id, fecha desc);

-- 1.8 Productos (POS). es_servicio = true -> sin control de stock (ej. Pase diario)
create table public.productos (
  id            uuid primary key default gen_random_uuid(),
  gym_id        uuid not null references public.gyms(id),
  nombre        text not null,
  categoria     text not null default 'Otros',  -- Bebidas, Suplementos, Pases, Otros
  precio        numeric(10,2) not null check (precio >= 0),
  stock         integer not null default 0,
  es_servicio   boolean not null default false,
  activo        boolean not null default true,
  created_at    timestamptz not null default now()
);
create index idx_productos_gym_id on public.productos(gym_id);

-- 1.9 Ventas de mostrador (1 fila por linea). Socio opcional.
create table public.ventas_productos (
  id               uuid primary key default gen_random_uuid(),
  gym_id           uuid not null references public.gyms(id),
  turno_id         uuid not null references public.turnos_caja(id),
  venta_grupo_id   uuid not null default gen_random_uuid(),  -- agrupa lineas de un mismo ticket
  producto_id      uuid references public.productos(id),
  descripcion      text not null,                            -- snapshot del nombre
  cantidad         integer not null check (cantidad > 0),
  precio_unitario  numeric(10,2) not null check (precio_unitario >= 0),
  total            numeric(10,2) generated always as (cantidad * precio_unitario) stored,
  socio_id         uuid references public.socios(id),
  cliente_nombre   text,
  estado           text not null default 'ACTIVO' check (estado in ('ACTIVO','ANULADO')),
  anulado_por      uuid references public.perfiles(id),
  anulado_at       timestamptz,
  motivo_anulacion text,
  registrado_por   uuid references public.perfiles(id),
  created_at       timestamptz not null default now(),
  check (estado = 'ACTIVO' or (anulado_por is not null and motivo_anulacion is not null))
);
create index idx_ventas_gym_id   on public.ventas_productos(gym_id);
create index idx_ventas_turno    on public.ventas_productos(turno_id);
create index idx_ventas_grupo    on public.ventas_productos(venta_grupo_id);

-- 1.10 Movimientos de caja = LIBRO CONTABLE (una fila por metodo de pago)
--      Pago mixto = varias filas con el mismo grupo_pago_id.
create table public.movimientos_caja (
  id               uuid primary key default gen_random_uuid(),
  gym_id           uuid not null references public.gyms(id),
  turno_id         uuid not null references public.turnos_caja(id),
  tipo             text not null check (tipo in ('INGRESO','EGRESO')),
  categoria        text not null check (categoria in ('MEMBRESIA','VENTA_PRODUCTO','GASTO','OTRO')),
  concepto         text not null,
  monto            numeric(10,2) not null check (monto > 0),
  metodo           text not null check (metodo in ('Efectivo','Yape','Plin','Tarjeta')),
  socio_id         uuid references public.socios(id),
  cliente_nombre   text,
  membresia_id     uuid references public.membresias(id),
  venta_grupo_id   uuid,                         -- enlaza con ventas_productos.venta_grupo_id
  grupo_pago_id    uuid not null default gen_random_uuid(),
  comprobante_url  text,                         -- captura Yape/Plin (WebP < 50KB)
  fecha_hora       timestamptz not null default now(),
  registrado_por   uuid not null references public.perfiles(id),
  estado           text not null default 'ACTIVO' check (estado in ('ACTIVO','ANULADO')),
  anulado_por      uuid references public.perfiles(id),
  anulado_at       timestamptz,
  motivo_anulacion text,
  check (estado = 'ACTIVO' or (anulado_por is not null and motivo_anulacion is not null))
);
create index idx_mov_gym_id     on public.movimientos_caja(gym_id);
create index idx_mov_turno      on public.movimientos_caja(turno_id) where estado = 'ACTIVO';
create index idx_mov_gym_fecha  on public.movimientos_caja(gym_id, fecha_hora desc);
create index idx_mov_membresia  on public.movimientos_caja(membresia_id) where membresia_id is not null;

-- ---------------------------------------------------------------------
-- 2. AUDITORIA INMUTABLE (prohibido DELETE / editar montos)
-- ---------------------------------------------------------------------
create or replace function public.bloquear_delete() returns trigger
language plpgsql as $$
begin
  raise exception 'DELETE prohibido en %. Use anulacion (estado=ANULADO + motivo).', tg_table_name;
end $$;

create trigger trg_no_delete_movimientos before delete on public.movimientos_caja
  for each row execute function public.bloquear_delete();
create trigger trg_no_delete_ventas before delete on public.ventas_productos
  for each row execute function public.bloquear_delete();
create trigger trg_no_delete_membresias before delete on public.membresias
  for each row execute function public.bloquear_delete();
create trigger trg_no_delete_turnos before delete on public.turnos_caja
  for each row execute function public.bloquear_delete();

-- Solo se pueden modificar los campos de anulacion en movimientos
create or replace function public.movimientos_solo_anulacion() returns trigger
language plpgsql as $$
begin
  if (new.gym_id, new.turno_id, new.tipo, new.categoria, new.concepto, new.monto, new.metodo,
      new.socio_id, new.membresia_id, new.fecha_hora, new.registrado_por)
     is distinct from
     (old.gym_id, old.turno_id, old.tipo, old.categoria, old.concepto, old.monto, old.metodo,
      old.socio_id, old.membresia_id, old.fecha_hora, old.registrado_por) then
    raise exception 'Los movimientos son inmutables; solo pueden anularse.';
  end if;
  if old.estado = 'ANULADO' then
    raise exception 'El movimiento ya esta ANULADO.';
  end if;
  return new;
end $$;
create trigger trg_mov_inmutable before update on public.movimientos_caja
  for each row execute function public.movimientos_solo_anulacion();

-- ---------------------------------------------------------------------
-- 3. HELPERS DE SESION (staff autenticado)
-- ---------------------------------------------------------------------
create or replace function public.mi_gym_id() returns uuid
language sql stable security definer set search_path = public as
$$ select gym_id from perfiles where id = auth.uid() and activo $$;

create or replace function public.mi_rol() returns text
language sql stable security definer set search_path = public as
$$ select rol from perfiles where id = auth.uid() and activo $$;

-- ---------------------------------------------------------------------
-- 4. VISTAS (consumibles por la app, Excel y Power BI)
-- ---------------------------------------------------------------------

-- 4.1 Estado de cada membresia con pagado / saldo / dias
create or replace view public.v_membresias_estado with (security_invoker = true) as
select m.id as membresia_id, m.gym_id, m.socio_id, m.plan_id, p.nombre as plan,
       m.fecha_inicio, m.fecha_fin, m.dias_congelados, m.precio_total, m.estado,
       coalesce(sum(mc.monto) filter (where mc.tipo='INGRESO' and mc.estado='ACTIVO'), 0) as monto_pagado,
       m.precio_total - coalesce(sum(mc.monto) filter (where mc.tipo='INGRESO' and mc.estado='ACTIVO'), 0) as saldo_pendiente,
       (m.fecha_fin - public.hoy_lima()) as dias_restantes
from membresias m
join planes p on p.id = m.plan_id
left join movimientos_caja mc on mc.membresia_id = m.id
group by m.id, p.nombre;

-- 4.2 Semaforo por socio (ultima membresia ACTIVA). Base del check-in.
create or replace view public.v_socio_estado with (security_invoker = true) as
select s.id as socio_id, s.gym_id, s.dni, s.nombres, s.apellidos, s.foto_url, s.telefono,
       v.membresia_id, v.plan, v.fecha_inicio, v.fecha_fin, v.dias_restantes,
       coalesce(v.saldo_pendiente, 0) as saldo_pendiente,
       case
         when v.membresia_id is null or v.dias_restantes < 0 then 'ROJO'
         when v.dias_restantes <= 3 or v.saldo_pendiente > 0 then 'AMBAR'
         else 'VERDE'
       end as semaforo
from socios s
left join lateral (
  select * from v_membresias_estado e
  where e.socio_id = s.id and e.estado = 'ACTIVO'
  order by e.fecha_fin desc limit 1
) v on true
where s.activo;

-- 4.3 Formato contable estandar (Excel y Power BI)
-- [Fecha, Hora, Turno, Tipo, Concepto, Monto, Metodo, Socio/Cliente, Responsable]
create or replace view public.v_movimientos_export with (security_invoker = true) as
select mc.gym_id,
       mc.id                                                        as movimiento_id,
       (mc.fecha_hora at time zone 'America/Lima')::date            as "Fecha",
       to_char(mc.fecha_hora at time zone 'America/Lima','HH24:MI') as "Hora",
       t.turno                                                      as "Turno",
       initcap(lower(mc.tipo))                                      as "Tipo",
       mc.concepto                                                  as "Concepto",
       mc.monto                                                     as "Monto",
       mc.metodo                                                    as "Método",
       coalesce(s.apellidos || ', ' || s.nombres, mc.cliente_nombre, 'Cliente mostrador') as "Socio/Cliente",
       pf.nombre                                                    as "Responsable",
       mc.categoria, mc.estado, mc.turno_id, mc.socio_id
from movimientos_caja mc
join turnos_caja t on t.id = mc.turno_id
join perfiles pf   on pf.id = mc.registrado_por
left join socios s on s.id = mc.socio_id;
-- Excel: filtrar estado = 'ACTIVO'. Power BI: usar todas las vistas/tablas (relaciones por gym_id).

-- ---------------------------------------------------------------------
-- 5. FUNCIONES RPC (logica pesada en BD)
-- ---------------------------------------------------------------------

-- 5.1 Abrir turno
create or replace function public.abrir_turno(p_turno text, p_fondo_inicial numeric)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if mi_gym_id() is null then raise exception 'Usuario sin perfil activo'; end if;
  insert into turnos_caja(gym_id, turno, fondo_inicial, abierto_por)
  values (mi_gym_id(), p_turno, p_fondo_inicial, auth.uid())
  returning id into v_id;
  return v_id;
exception when unique_violation then
  raise exception 'Ya existe un turno ABIERTO. Cierrelo antes de abrir otro.';
end $$;

-- 5.2 Arqueo teorico en vivo: Fondo + Ingresos efectivo - Egresos efectivo
create or replace function public.resumen_turno(p_turno_id uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'fondo_inicial', t.fondo_inicial,
    'ingresos_efectivo', coalesce(sum(m.monto) filter (where m.tipo='INGRESO' and m.metodo='Efectivo'),0),
    'egresos_efectivo',  coalesce(sum(m.monto) filter (where m.tipo='EGRESO'  and m.metodo='Efectivo'),0),
    'efectivo_esperado', t.fondo_inicial
        + coalesce(sum(m.monto) filter (where m.tipo='INGRESO' and m.metodo='Efectivo'),0)
        - coalesce(sum(m.monto) filter (where m.tipo='EGRESO'  and m.metodo='Efectivo'),0),
    'ingresos_yape',    coalesce(sum(m.monto) filter (where m.tipo='INGRESO' and m.metodo='Yape'),0),
    'ingresos_plin',    coalesce(sum(m.monto) filter (where m.tipo='INGRESO' and m.metodo='Plin'),0),
    'ingresos_tarjeta', coalesce(sum(m.monto) filter (where m.tipo='INGRESO' and m.metodo='Tarjeta'),0),
    'total_ingresos',   coalesce(sum(m.monto) filter (where m.tipo='INGRESO'),0),
    'total_egresos',    coalesce(sum(m.monto) filter (where m.tipo='EGRESO'),0)
  )
  from turnos_caja t
  left join movimientos_caja m on m.turno_id = t.id and m.estado = 'ACTIVO'
  where t.id = p_turno_id
    and t.gym_id = mi_gym_id()
    and (mi_rol() = 'admin' or t.abierto_por = auth.uid())
  group by t.id
$$;

-- 5.3 Cerrar turno (recepcionista confirma efectivo real)
create or replace function public.cerrar_turno(p_turno_id uuid, p_efectivo_real numeric, p_obs text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_res jsonb; v_esp numeric;
begin
  v_res := resumen_turno(p_turno_id);
  if v_res is null then raise exception 'Turno no encontrado o sin permiso'; end if;
  v_esp := (v_res->>'efectivo_esperado')::numeric;
  update turnos_caja set estado='CERRADO', cerrado_por=auth.uid(), cerrado_at=now(),
         efectivo_esperado=v_esp, efectivo_real=p_efectivo_real,
         diferencia=p_efectivo_real - v_esp, observaciones=p_obs
  where id = p_turno_id and estado='ABIERTO';
  if not found then raise exception 'El turno no esta ABIERTO'; end if;
  return v_res || jsonb_build_object('efectivo_real', p_efectivo_real, 'diferencia', p_efectivo_real - v_esp);
end $$;

-- 5.4 Registrar membresia / renovar con pago (total, parcial o mixto)
--     p_pagos: [{"metodo":"Efectivo","monto":50},{"metodo":"Yape","monto":30}]  (puede ser [] = todo a deuda)
create or replace function public.registrar_membresia(
  p_socio_id uuid, p_plan_id uuid, p_fecha_inicio date, p_pagos jsonb default '[]'::jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_plan planes; v_turno uuid; v_mem uuid; v_pago jsonb; v_sum numeric := 0; v_grupo uuid := gen_random_uuid();
begin
  select * into v_plan from planes where id = p_plan_id and gym_id = mi_gym_id() and activo;
  if not found then raise exception 'Plan no valido'; end if;
  perform 1 from socios where id = p_socio_id and gym_id = mi_gym_id();
  if not found then raise exception 'Socio no valido'; end if;

  select id into v_turno from turnos_caja where gym_id = mi_gym_id() and estado='ABIERTO';
  if v_turno is null and jsonb_array_length(p_pagos) > 0 then
    raise exception 'No hay turno abierto para registrar el cobro';
  end if;

  for v_pago in select * from jsonb_array_elements(p_pagos) loop
    v_sum := v_sum + (v_pago->>'monto')::numeric;
  end loop;
  if v_sum > v_plan.precio then raise exception 'El pago excede el precio del plan'; end if;

  insert into membresias(gym_id, socio_id, plan_id, fecha_inicio, fecha_fin, precio_total, created_by)
  values (mi_gym_id(), p_socio_id, p_plan_id, p_fecha_inicio,
          p_fecha_inicio + v_plan.duracion_dias, v_plan.precio, auth.uid())
  returning id into v_mem;

  for v_pago in select * from jsonb_array_elements(p_pagos) loop
    insert into movimientos_caja(gym_id, turno_id, tipo, categoria, concepto, monto, metodo,
                                 socio_id, membresia_id, grupo_pago_id, registrado_por)
    values (mi_gym_id(), v_turno, 'INGRESO', 'MEMBRESIA', 'Membresía ' || v_plan.nombre,
            (v_pago->>'monto')::numeric, v_pago->>'metodo', p_socio_id, v_mem, v_grupo, auth.uid());
  end loop;
  return v_mem;
end $$;

-- 5.5 Abonar a una deuda de membresia (pago a cuenta posterior)
create or replace function public.abonar_membresia(p_membresia_id uuid, p_pagos jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare v_saldo numeric; v_turno uuid; v_pago jsonb; v_sum numeric := 0; v_grupo uuid := gen_random_uuid(); v_socio uuid;
begin
  select saldo_pendiente, socio_id into v_saldo, v_socio from v_membresias_estado
   where membresia_id = p_membresia_id and gym_id = mi_gym_id() and estado='ACTIVO';
  if v_saldo is null then raise exception 'Membresia no valida'; end if;
  select id into v_turno from turnos_caja where gym_id = mi_gym_id() and estado='ABIERTO';
  if v_turno is null then raise exception 'No hay turno abierto'; end if;
  for v_pago in select * from jsonb_array_elements(p_pagos) loop
    v_sum := v_sum + (v_pago->>'monto')::numeric;
  end loop;
  if v_sum > v_saldo then raise exception 'El abono excede el saldo pendiente (%)', v_saldo; end if;
  for v_pago in select * from jsonb_array_elements(p_pagos) loop
    insert into movimientos_caja(gym_id, turno_id, tipo, categoria, concepto, monto, metodo,
                                 socio_id, membresia_id, grupo_pago_id, registrado_por)
    values (mi_gym_id(), v_turno, 'INGRESO', 'MEMBRESIA', 'Abono de membresía',
            (v_pago->>'monto')::numeric, v_pago->>'metodo', v_socio, p_membresia_id, v_grupo, auth.uid());
  end loop;
end $$;

-- 5.6 Congelar membresia: suma los dias a fecha_fin
create or replace function public.congelar_membresia(p_membresia_id uuid, p_dias integer)
returns date language plpgsql security definer set search_path = public as $$
declare v_pl planes; v_m membresias;
begin
  if p_dias <= 0 then raise exception 'Dias invalidos'; end if;
  select * into v_m from membresias where id = p_membresia_id and gym_id = mi_gym_id() and estado='ACTIVO';
  if not found then raise exception 'Membresia no valida'; end if;
  select * into v_pl from planes where id = v_m.plan_id;
  if not v_pl.permite_congelar then raise exception 'El plan no permite congelamiento'; end if;
  if v_pl.max_dias_congelar is not null and v_m.dias_congelados + p_dias > v_pl.max_dias_congelar then
    raise exception 'Excede el maximo de dias congelables (%)', v_pl.max_dias_congelar;
  end if;
  update membresias set dias_congelados = dias_congelados + p_dias,
                        fecha_fin = fecha_fin + p_dias
   where id = p_membresia_id returning fecha_fin into v_m.fecha_fin;
  return v_m.fecha_fin;
end $$;

-- 5.7 Venta rapida de mostrador (carrito + pagos, socio opcional)
--     p_items: [{"producto_id":"...","cantidad":2}]   p_pagos: [{"metodo":"Yape","monto":6}]
create or replace function public.registrar_venta(
  p_items jsonb, p_pagos jsonb, p_socio_id uuid default null, p_cliente text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_turno uuid; v_grupo uuid := gen_random_uuid(); v_pgrupo uuid := gen_random_uuid();
        v_item jsonb; v_prod productos; v_total numeric := 0; v_sum numeric := 0; v_pago jsonb; v_cant int;
begin
  select id into v_turno from turnos_caja where gym_id = mi_gym_id() and estado='ABIERTO';
  if v_turno is null then raise exception 'No hay turno abierto'; end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_cant := (v_item->>'cantidad')::int;
    select * into v_prod from productos
     where id = (v_item->>'producto_id')::uuid and gym_id = mi_gym_id() and activo for update;
    if not found then raise exception 'Producto no valido'; end if;
    if not v_prod.es_servicio then
      if v_prod.stock < v_cant then raise exception 'Stock insuficiente: %', v_prod.nombre; end if;
      update productos set stock = stock - v_cant where id = v_prod.id;
    end if;
    insert into ventas_productos(gym_id, turno_id, venta_grupo_id, producto_id, descripcion, cantidad,
                                 precio_unitario, socio_id, cliente_nombre, registrado_por)
    values (mi_gym_id(), v_turno, v_grupo, v_prod.id, v_prod.nombre, v_cant,
            v_prod.precio, p_socio_id, p_cliente, auth.uid());
    v_total := v_total + v_prod.precio * v_cant;
  end loop;

  for v_pago in select * from jsonb_array_elements(p_pagos) loop
    v_sum := v_sum + (v_pago->>'monto')::numeric;
  end loop;
  if v_sum <> v_total then raise exception 'Los pagos (%) deben igualar el total (%)', v_sum, v_total; end if;

  for v_pago in select * from jsonb_array_elements(p_pagos) loop
    insert into movimientos_caja(gym_id, turno_id, tipo, categoria, concepto, monto, metodo,
                                 socio_id, cliente_nombre, venta_grupo_id, grupo_pago_id, registrado_por)
    values (mi_gym_id(), v_turno, 'INGRESO', 'VENTA_PRODUCTO', 'Venta mostrador',
            (v_pago->>'monto')::numeric, v_pago->>'metodo', p_socio_id, p_cliente, v_grupo, v_pgrupo, auth.uid());
  end loop;
  return v_grupo;
end $$;

-- 5.8 Egreso / gasto de caja chica
create or replace function public.registrar_egreso(p_concepto text, p_monto numeric, p_metodo text default 'Efectivo')
returns uuid language plpgsql security definer set search_path = public as $$
declare v_turno uuid; v_id uuid;
begin
  select id into v_turno from turnos_caja where gym_id = mi_gym_id() and estado='ABIERTO';
  if v_turno is null then raise exception 'No hay turno abierto'; end if;
  insert into movimientos_caja(gym_id, turno_id, tipo, categoria, concepto, monto, metodo, registrado_por)
  values (mi_gym_id(), v_turno, 'EGRESO', 'GASTO', p_concepto, p_monto, p_metodo, auth.uid())
  returning id into v_id;
  return v_id;
end $$;

-- 5.9 Anulaciones (soft delete con auditoria)
create or replace function public.anular_movimiento(p_id uuid, p_motivo text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if coalesce(trim(p_motivo),'') = '' then raise exception 'El motivo es obligatorio'; end if;
  update movimientos_caja set estado='ANULADO', anulado_por=auth.uid(), anulado_at=now(), motivo_anulacion=p_motivo
   where id = p_id and gym_id = mi_gym_id() and estado='ACTIVO'
     and (mi_rol()='admin' or turno_id in (select id from turnos_caja where estado='ABIERTO' and abierto_por=auth.uid()));
  if not found then raise exception 'No se pudo anular (inexistente, ya anulado o turno cerrado)'; end if;
end $$;

create or replace function public.anular_membresia(p_id uuid, p_motivo text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if mi_rol() <> 'admin' then raise exception 'Solo admin puede anular membresias'; end if;
  if coalesce(trim(p_motivo),'') = '' then raise exception 'El motivo es obligatorio'; end if;
  update membresias set estado='ANULADO', anulado_por=auth.uid(), anulado_at=now(), motivo_anulacion=p_motivo
   where id = p_id and gym_id = mi_gym_id() and estado='ACTIVO';
  if not found then raise exception 'Membresia no encontrada o ya anulada'; end if;
  update movimientos_caja set estado='ANULADO', anulado_por=auth.uid(), anulado_at=now(),
         motivo_anulacion='Anulación de membresía: ' || p_motivo
   where membresia_id = p_id and estado='ACTIVO';
end $$;

create or replace function public.anular_venta(p_venta_grupo_id uuid, p_motivo text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if coalesce(trim(p_motivo),'') = '' then raise exception 'El motivo es obligatorio'; end if;
  update ventas_productos set estado='ANULADO', anulado_por=auth.uid(), anulado_at=now(), motivo_anulacion=p_motivo
   where venta_grupo_id = p_venta_grupo_id and gym_id = mi_gym_id() and estado='ACTIVO';
  if not found then raise exception 'Venta no encontrada o ya anulada'; end if;
  -- devolver stock de productos no-servicio
  update productos p set stock = p.stock + v.cantidad
    from ventas_productos v
   where v.venta_grupo_id = p_venta_grupo_id and v.producto_id = p.id and not p.es_servicio;
  update movimientos_caja set estado='ANULADO', anulado_por=auth.uid(), anulado_at=now(),
         motivo_anulacion='Anulación de venta: ' || p_motivo
   where venta_grupo_id = p_venta_grupo_id and estado='ACTIVO';
end $$;

-- 5.10 Check-in (1 por dia; devuelve el estado del semaforo)
create or replace function public.registrar_asistencia(p_socio_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_e v_socio_estado;
begin
  select * into v_e from v_socio_estado where socio_id = p_socio_id and gym_id = mi_gym_id();
  if not found then raise exception 'Socio no encontrado'; end if;
  insert into asistencias(gym_id, socio_id, membresia_id, semaforo, registrado_por)
  values (mi_gym_id(), p_socio_id, v_e.membresia_id, v_e.semaforo, auth.uid())
  on conflict (socio_id, fecha) do nothing;
  return to_jsonb(v_e);
end $$;

-- 5.11 Dashboard admin: totales por rango y metodo (sin bajar filas al cliente)
create or replace function public.resumen_periodo(p_desde date, p_hasta date)
returns table(fecha date, turno text, tipo text, metodo text, total numeric, cantidad bigint)
language sql stable security definer set search_path = public as $$
  select (m.fecha_hora at time zone 'America/Lima')::date, t.turno, m.tipo, m.metodo,
         sum(m.monto), count(*)
  from movimientos_caja m join turnos_caja t on t.id = m.turno_id
  where mi_rol() = 'admin' and m.gym_id = mi_gym_id() and m.estado = 'ACTIVO'
    and (m.fecha_hora at time zone 'America/Lima')::date between p_desde and p_hasta
  group by 1,2,3,4
  order by 1 desc
$$;

-- 5.12 PORTAL SOCIO (publico, sin cuenta): solo DNI. Devuelve datos minimos.
--      El Rate Limiting se aplica en la API route de Next.js (/api/consulta).
create or replace function public.consulta_socio(p_dni text, p_gym_id uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'nombres', e.nombres,
    'plan', e.plan,
    'fecha_fin', e.fecha_fin,
    'dias_restantes', e.dias_restantes,
    'saldo_pendiente', e.saldo_pendiente,
    'semaforo', e.semaforo,
    'asistencias_mes', (select count(*) from asistencias a
                         where a.socio_id = e.socio_id
                           and a.fecha >= date_trunc('month', public.hoy_lima())::date)
  )
  from v_socio_estado e
  where e.dni = p_dni and e.gym_id = p_gym_id
$$;
-- Solo la API server-side (service role) debe poder invocarla:
revoke execute on function public.consulta_socio(text, uuid) from public, anon, authenticated;
grant  execute on function public.consulta_socio(text, uuid) to service_role;

-- Landing publica: planes visibles
create or replace view public.v_landing_planes as
select gym_id, id, nombre, descripcion, duracion_dias, precio
from planes where activo and visible_landing;
grant select on public.v_landing_planes to anon, authenticated;

-- ---------------------------------------------------------------------
-- 6. RLS: DESACTIVADO en fase dev (se activara por gym_id + rol despues)
-- ---------------------------------------------------------------------
alter table public.gyms             disable row level security;
alter table public.perfiles         disable row level security;
alter table public.socios           disable row level security;
alter table public.planes           disable row level security;
alter table public.membresias       disable row level security;
alter table public.asistencias      disable row level security;
alter table public.productos        disable row level security;
alter table public.ventas_productos disable row level security;
alter table public.turnos_caja      disable row level security;
alter table public.movimientos_caja disable row level security;

-- ---------------------------------------------------------------------
-- 7. SEED DE DESARROLLO
-- ---------------------------------------------------------------------
insert into public.gyms(nombre, slug, descripcion)
values ('Zentra Fitness', 'zentra-fitness', 'Gimnasio local')
on conflict (slug) do nothing;

insert into public.planes(gym_id, nombre, duracion_dias, precio, permite_congelar, max_dias_congelar)
select g.id, x.n, x.d, x.p, x.c, x.m from public.gyms g,
 (values ('Mensual',30,80,true,7), ('Trimestral',90,210,true,15), ('Semanal',7,25,false,null::int)) as x(n,d,p,c,m)
where g.slug = 'zentra-fitness';

insert into public.productos(gym_id, nombre, categoria, precio, stock, es_servicio)
select g.id, x.n, x.c, x.p, x.s, x.e from public.gyms g,
 (values ('Agua 625ml','Bebidas',2.00,50,false), ('Gatorade','Bebidas',4.00,30,false),
         ('Pase diario','Pases',8.00,0,true)) as x(n,c,p,s,e)
where g.slug = 'zentra-fitness';

-- Crear staff: 1) Authentication > Users > Add user (email/clave)
--              2) insert into perfiles(id, gym_id, nombre, rol)
--                 values ('<uuid auth>', (select id from gyms where slug = 'zentra-fitness'), 'Dueño', 'admin');

