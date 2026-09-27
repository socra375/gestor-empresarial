-- ============================================================
-- 012 — Rendimiento (avisos del linter de Supabase)
-- ============================================================
-- Qué cambia (se puede ejecutar varias veces; no cambia permisos):
-- * Índices para las claves foráneas que no tenían uno (búsquedas por
--   cliente, servicio, usuario o factura, y borrados en cascada).
-- * Las políticas RLS que usaban auth.uid() pasan a (select auth.uid()):
--   misma regla, pero Postgres la calcula una vez por consulta en vez de
--   una vez por fila.
-- * Se elimina idx_invites_code: duplicaba el índice único de
--   employee_invites.code.
-- ============================================================

create index if not exists idx_appt_customer on public.appointments (customer_id);
create index if not exists idx_appt_service on public.appointments (service_id);
create index if not exists idx_members_user on public.business_members (user_id);
create index if not exists idx_credits_customer on public.customer_credits (customer_id);
create index if not exists idx_credits_invoice on public.customer_credits (invoice_id);
create index if not exists idx_invites_business on public.employee_invites (business_id);
create index if not exists idx_invoices_customer on public.invoices (customer_id);
create index if not exists idx_specserv_service on public.specialist_services (service_id);

drop index if exists public.idx_invites_code;

alter policy insert_own_business on public.businesses
  with check (id = (select auth.uid()));
alter policy update_own_business on public.businesses
  using (id = (select auth.uid()));

alter policy admin_insert_members on public.business_members
  with check (business_id = (select auth.uid()) and user_id = (select auth.uid()));
alter policy admin_update_members on public.business_members
  using (business_id = (select auth.uid()));
alter policy admin_delete_members on public.business_members
  using (business_id = (select auth.uid()));

alter policy admin_upsert_settings_insert on public.business_settings
  with check (business_id = (select auth.uid()));
alter policy admin_upsert_settings_update on public.business_settings
  using (business_id = (select auth.uid()));

alter policy admin_manage_invites on public.employee_invites
  using (business_id = (select auth.uid()) and current_business_has_module('equipo'))
  with check (business_id = (select auth.uid()) and current_business_has_module('equipo'));
