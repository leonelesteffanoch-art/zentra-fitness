-- =====================================================================
-- ZENTRA FITNESS - Costo de compra en productos para cálculo de margen
-- Ejecutar en: Supabase > SQL Editor > New query
-- =====================================================================
alter table public.productos add column if not exists costo numeric(10,2) not null default 0;
