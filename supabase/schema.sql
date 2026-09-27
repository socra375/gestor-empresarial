-- ============================================================
-- GESTIÓN SALÓN — Schema completo para Supabase (Postgres)
-- Pega este archivo completo en el SQL Editor de tu proyecto
-- Supabase y ejecútalo de una sola vez.
-- ============================================================

create extension if not exists pgcrypto;

-- ============================================================
-- 1. TABLAS PRINCIPALES
-- ============================================================
-- (las tablas van primero: la función helper de la sección 2
-- referencia business_members, así que debe existir antes)

create table if not exists businesses (
  id uuid primary key,
  name text not null default 'Mi Salón',
  business_type text default 'individual',
  team_size int,
  onboarding_completed boolean default false,
  legal_name text,
  tax_id text,
  phone text,
  address text,
  logo_url text,
  currency_symbol text default '$',
  tax_enabled boolean default false,
  tax_percentage numeric default 0,
  tax_included_in_price boolean default true,
  payment_methods jsonb default '{"efectivo":true,"transferencia":true,"tarjeta":true,"credito":true}',
  global_low_stock_alert boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists business_members (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'employee', -- 'admin' | 'employee'
  employee_name text,
  role_title text,
  created_at timestamptz default now(),
  unique (business_id, user_id)
);

create table if not exists business_settings (
  business_id uuid primary key references businesses(id) on delete cascade,
  pct_inventory int default 40,
  pct_operations int default 30,
  pct_savings int default 15,
  pct_personal int default 15,
  updated_at timestamptz default now()
);

create table if not exists employee_invites (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  code text not null unique,
  used boolean default false,
  used_by uuid,
  used_at timestamptz,
  created_at timestamptz default now(),
  -- Vigencia del código (72h por defecto). El "is null" en redeem_invite_code
  -- cubre las filas creadas antes de que existiera esta columna.
  expires_at timestamptz default (now() + interval '72 hours')
);

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  phone text,
  notes text,
  created_at timestamptz default now()
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  purchase_price numeric default 0,
  sale_price numeric not null,
  stock int not null default 0,
  min_stock int not null default 0,
  created_at timestamptz default now()
);

create table if not exists sales (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  items jsonb not null default '[]',
  total numeric not null default 0,
  profit numeric not null default 0,
  payment_method text,
  created_at timestamptz default now()
);

create table if not exists customer_credits (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  customer_id uuid references customers(id) on delete cascade,
  sale_id uuid references sales(id) on delete set null,
  amount numeric not null,
  amount_paid numeric not null default 0,
  status text not null default 'pendiente', -- pendiente | parcial | pagado
  created_at timestamptz default now()
);

create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  sale_id uuid references sales(id) on delete set null,
  customer_id uuid references customers(id) on delete set null,
  invoice_number text not null,
  subtotal numeric not null,
  tax_amount numeric not null default 0,
  total numeric not null,
  created_at timestamptz default now()
);

create table if not exists activity_log (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  user_id uuid,
  action text not null,
  created_at timestamptz default now()
);

-- --- Módulos nuevos del salón ---

create table if not exists services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  category text,
  duration_minutes int not null default 30,
  price numeric not null,
  active boolean default true,
  created_at timestamptz default now()
);

create table if not exists specialist_services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  employee_id uuid not null, -- id del admin o de business_members.user_id
  service_id uuid not null references services(id) on delete cascade,
  commission_pct numeric default 0,
  created_at timestamptz default now()
);

create table if not exists appointments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  customer_id uuid references customers(id) on delete set null,
  employee_id uuid not null,
  service_id uuid not null references services(id),
  start_at timestamptz not null,
  end_at timestamptz not null,
  status text not null default 'pendiente', -- pendiente | confirmada | completada | cancelada | no_show
  notes text,
  created_at timestamptz default now()
);

-- ============================================================
-- 2. FUNCIÓN HELPER: resuelve el business_id del usuario actual
-- ============================================================
-- Si el usuario es empleado, business_members tiene su fila.
-- Si es admin (dueño), su propio auth.uid() ES el business_id
-- (así es como el front-end crea el negocio en el primer login).
create or replace function public.get_current_business_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select business_id from business_members where user_id = auth.uid() limit 1),
    auth.uid()
  );
$$;

grant execute on function public.get_current_business_id() to authenticated;

-- Un empleado (business_members.role = 'employee') es de solo lectura en
-- todo el negocio; solo el admin (el dueño, o un futuro miembro con
-- role = 'admin') puede crear, modificar o borrar. Se reconocen dos formas
-- de ser admin porque hoy el dueño nunca tiene fila en business_members
-- (su propio auth.uid() ES el business_id) — la condición sobre
-- business_members.role deja el camino abierto a varios admins por
-- negocio en el futuro sin tener que tocar esta función de nuevo.
create or replace function public.is_current_business_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() = get_current_business_id()
    or exists (
      select 1 from business_members bm
      where bm.business_id = get_current_business_id()
        and bm.user_id = auth.uid()
        and bm.role = 'admin'
    );
$$;

grant execute on function public.is_current_business_admin() to authenticated;

-- ============================================================
-- 3. ÍNDICES
-- ============================================================
create index if not exists idx_members_business on business_members(business_id);
create index if not exists idx_customers_business on customers(business_id);
create index if not exists idx_products_business on products(business_id);
create index if not exists idx_sales_business on sales(business_id);
create index if not exists idx_credits_business on customer_credits(business_id);
create index if not exists idx_invoices_business on invoices(business_id);
create index if not exists idx_activity_business on activity_log(business_id);
create index if not exists idx_services_business on services(business_id);
create index if not exists idx_specserv_business on specialist_services(business_id);
create index if not exists idx_appt_business_date on appointments(business_id, start_at);
create index if not exists idx_invites_code on employee_invites(code);

-- ============================================================
-- 4. FUNCIÓN RPC: canjear código de invitación de empleado
-- ============================================================
create or replace function public.redeem_invite_code(input_code text, input_employee_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_id uuid;
  v_expires_at timestamptz;
begin
  select business_id, expires_at into v_business_id, v_expires_at
  from employee_invites
  where code = input_code and used = false
  limit 1;

  if v_business_id is null then
    raise exception 'Código de invitación inválido o ya utilizado';
  end if;

  if v_expires_at is not null and v_expires_at <= now() then
    raise exception 'El código de invitación venció. Pide al administrador que genere uno nuevo';
  end if;

  insert into business_members (business_id, user_id, role, employee_name)
  values (v_business_id, auth.uid(), 'employee', input_employee_name)
  on conflict (business_id, user_id) do nothing;

  update employee_invites
    set used = true, used_by = auth.uid(), used_at = now()
    where code = input_code;

  return v_business_id;
end;
$$;

grant execute on function public.redeem_invite_code(text, text) to authenticated;

-- ============================================================
-- 5. ROW LEVEL SECURITY
-- ============================================================
-- Regla general: cualquier miembro del negocio (admin o empleado)
-- puede leer/escribir los datos de SU negocio. La separación de
-- permisos admin/empleado en pantalla ya la hace el front-end
-- (nav-admin-only); esto puede reforzarse más adelante si lo necesitas.

alter table businesses enable row level security;
create policy "select_own_business" on businesses for select using (id = get_current_business_id());
create policy "insert_own_business" on businesses for insert with check (id = auth.uid());
create policy "update_own_business" on businesses for update using (id = auth.uid());

alter table business_members enable row level security;
create policy "select_team" on business_members for select using (business_id = get_current_business_id());
-- Solo puedes afiliarte a TI MISMO y solo a tu propio negocio. Sin la
-- condición sobre user_id, cualquiera podría afiliar a otro dueño a su
-- negocio: get_current_business_id() devolvería el negocio del atacante
-- y la víctima entraría al salón equivocado al iniciar sesión.
-- A los empleados los afilia redeem_invite_code (security definer).
create policy "admin_insert_members" on business_members for insert
  with check (business_id = auth.uid() and user_id = auth.uid());
create policy "admin_update_members" on business_members for update using (business_id = auth.uid());
create policy "admin_delete_members" on business_members for delete using (business_id = auth.uid());

alter table business_settings enable row level security;
create policy "select_settings" on business_settings for select using (business_id = get_current_business_id());
create policy "admin_upsert_settings_insert" on business_settings for insert with check (business_id = auth.uid());
create policy "admin_upsert_settings_update" on business_settings for update using (business_id = auth.uid());

alter table employee_invites enable row level security;
create policy "admin_manage_invites" on employee_invites for all
  using (business_id = auth.uid()) with check (business_id = auth.uid());

-- Un empleado puede LEER todo el negocio; solo el admin puede escribir.
-- Antes cada una de estas 8 tablas tenía una sola política "for all" que
-- daba a cualquier miembro (admin o empleado) los mismos permisos de
-- lectura Y escritura — la pantalla de "solo lectura" para empleados era
-- solo apariencia del frontend, nada la respaldaba en la base de datos.
-- products/sales ya no los usa el frontend (son del módulo de
-- Ventas/Inventario eliminado), pero seguían abiertos por API igual que
-- el resto — se cierran también por consistencia.

alter table customers enable row level security;
drop policy if exists "members_all_customers" on customers;
-- create policy "members_all_customers" on customers for all using (business_id = get_current_business_id()) with check (business_id = get_current_business_id()); -- ROLLBACK: política original
create policy "select_customers" on customers for select using (business_id = get_current_business_id());
create policy "admin_insert_customers" on customers for insert with check (business_id = get_current_business_id() and is_current_business_admin());
create policy "admin_update_customers" on customers for update using (business_id = get_current_business_id() and is_current_business_admin()) with check (business_id = get_current_business_id() and is_current_business_admin());
create policy "admin_delete_customers" on customers for delete using (business_id = get_current_business_id() and is_current_business_admin());

alter table products enable row level security;
drop policy if exists "members_all_products" on products;
-- create policy "members_all_products" on products for all using (business_id = get_current_business_id()) with check (business_id = get_current_business_id()); -- ROLLBACK: política original
create policy "select_products" on products for select using (business_id = get_current_business_id());
create policy "admin_insert_products" on products for insert with check (business_id = get_current_business_id() and is_current_business_admin());
create policy "admin_update_products" on products for update using (business_id = get_current_business_id() and is_current_business_admin()) with check (business_id = get_current_business_id() and is_current_business_admin());
create policy "admin_delete_products" on products for delete using (business_id = get_current_business_id() and is_current_business_admin());

alter table sales enable row level security;
drop policy if exists "members_all_sales" on sales;
-- create policy "members_all_sales" on sales for all using (business_id = get_current_business_id()) with check (business_id = get_current_business_id()); -- ROLLBACK: política original
create policy "select_sales" on sales for select using (business_id = get_current_business_id());
create policy "admin_insert_sales" on sales for insert with check (business_id = get_current_business_id() and is_current_business_admin());
create policy "admin_update_sales" on sales for update using (business_id = get_current_business_id() and is_current_business_admin()) with check (business_id = get_current_business_id() and is_current_business_admin());
create policy "admin_delete_sales" on sales for delete using (business_id = get_current_business_id() and is_current_business_admin());

alter table customer_credits enable row level security;
drop policy if exists "members_all_credits" on customer_credits;
-- create policy "members_all_credits" on customer_credits for all using (business_id = get_current_business_id()) with check (business_id = get_current_business_id()); -- ROLLBACK: política original
create policy "select_credits" on customer_credits for select using (business_id = get_current_business_id());
create policy "admin_insert_credits" on customer_credits for insert with check (business_id = get_current_business_id() and is_current_business_admin());
create policy "admin_update_credits" on customer_credits for update using (business_id = get_current_business_id() and is_current_business_admin()) with check (business_id = get_current_business_id() and is_current_business_admin());
create policy "admin_delete_credits" on customer_credits for delete using (business_id = get_current_business_id() and is_current_business_admin());

alter table invoices enable row level security;
drop policy if exists "members_all_invoices" on invoices;
-- create policy "members_all_invoices" on invoices for all using (business_id = get_current_business_id()) with check (business_id = get_current_business_id()); -- ROLLBACK: política original
create policy "select_invoices" on invoices for select using (business_id = get_current_business_id());
create policy "admin_insert_invoices" on invoices for insert with check (business_id = get_current_business_id() and is_current_business_admin());
create policy "admin_update_invoices" on invoices for update using (business_id = get_current_business_id() and is_current_business_admin()) with check (business_id = get_current_business_id() and is_current_business_admin());
create policy "admin_delete_invoices" on invoices for delete using (business_id = get_current_business_id() and is_current_business_admin());

alter table activity_log enable row level security;
create policy "members_select_activity" on activity_log for select using (business_id = get_current_business_id());
drop policy if exists "members_insert_activity" on activity_log;
-- create policy "members_insert_activity" on activity_log for insert with check (business_id = get_current_business_id()); -- ROLLBACK: política original
create policy "admin_insert_activity" on activity_log for insert with check (business_id = get_current_business_id() and is_current_business_admin());

alter table services enable row level security;
drop policy if exists "members_all_services" on services;
-- create policy "members_all_services" on services for all using (business_id = get_current_business_id()) with check (business_id = get_current_business_id()); -- ROLLBACK: política original
create policy "select_services" on services for select using (business_id = get_current_business_id());
create policy "admin_insert_services" on services for insert with check (business_id = get_current_business_id() and is_current_business_admin());
create policy "admin_update_services" on services for update using (business_id = get_current_business_id() and is_current_business_admin()) with check (business_id = get_current_business_id() and is_current_business_admin());
create policy "admin_delete_services" on services for delete using (business_id = get_current_business_id() and is_current_business_admin());

alter table specialist_services enable row level security;
drop policy if exists "members_all_specserv" on specialist_services;
-- create policy "members_all_specserv" on specialist_services for all using (business_id = get_current_business_id()) with check (business_id = get_current_business_id()); -- ROLLBACK: política original
create policy "select_specserv" on specialist_services for select using (business_id = get_current_business_id());
create policy "admin_insert_specserv" on specialist_services for insert with check (business_id = get_current_business_id() and is_current_business_admin());
create policy "admin_update_specserv" on specialist_services for update using (business_id = get_current_business_id() and is_current_business_admin()) with check (business_id = get_current_business_id() and is_current_business_admin());
create policy "admin_delete_specserv" on specialist_services for delete using (business_id = get_current_business_id() and is_current_business_admin());

alter table appointments enable row level security;
drop policy if exists "members_all_appointments" on appointments;
-- create policy "members_all_appointments" on appointments for all using (business_id = get_current_business_id()) with check (business_id = get_current_business_id()); -- ROLLBACK: política original
create policy "select_appointments" on appointments for select using (business_id = get_current_business_id());
create policy "admin_insert_appointments" on appointments for insert with check (business_id = get_current_business_id() and is_current_business_admin());
create policy "admin_update_appointments" on appointments for update using (business_id = get_current_business_id() and is_current_business_admin()) with check (business_id = get_current_business_id() and is_current_business_admin());
create policy "admin_delete_appointments" on appointments for delete using (business_id = get_current_business_id() and is_current_business_admin());

-- ============================================================
-- 6. STORAGE — bucket para logos del salón
-- ============================================================
insert into storage.buckets (id, name, public)
values ('business-logos', 'business-logos', true)
on conflict (id) do nothing;

create policy "public_read_logos" on storage.objects
  for select using (bucket_id = 'business-logos');

create policy "business_upload_own_logo" on storage.objects
  for insert with check (
    bucket_id = 'business-logos'
    and (storage.foldername(name))[1] = get_current_business_id()::text
  );

create policy "business_update_own_logo" on storage.objects
  for update using (
    bucket_id = 'business-logos'
    and (storage.foldername(name))[1] = get_current_business_id()::text
  );

-- ============================================================
-- 7. MIGRACIÓN — Se elimina Ventas/Inventario, Facturas ahora
--    nace de una cita completada. Ejecuta SOLO este bloque si
--    ya corriste el script completo anteriormente.
-- ============================================================

-- Sitio web del negocio (pie de la factura)
alter table businesses add column if not exists website text;

-- Domicilio y e-mail del cliente (encabezado de la factura)
alter table customers add column if not exists address text;
alter table customers add column if not exists email text;

-- Precio del servicio al momento de la cita (para el dashboard
-- e historial, aunque el precio del servicio cambie después)
alter table appointments add column if not exists price numeric;

-- Las facturas ahora se generan desde una cita completada, no
-- desde una venta de producto
alter table invoices add column if not exists appointment_id uuid references appointments(id);

-- Los créditos ("fiado") ahora se generan desde una factura de
-- servicio, no desde una venta de producto
alter table customer_credits add column if not exists invoice_id uuid references invoices(id);

create index if not exists idx_invoices_appointment on invoices(appointment_id);

-- Idioma de la interfaz para este negocio: 'es' | 'en' | 'fr'
alter table businesses add column if not exists language text default 'es';

-- Nombre del cliente en la factura. Se guarda siempre, sea un cliente
-- registrado (customer_id) o un walk-in sin registrar previamente:
-- el nombre es obligatorio en la factura, pero no exige estar en Clientes.
alter table invoices add column if not exists customer_name text;

-- Personalización visual del negocio: tono de la interfaz ('dark' | 'light')
-- y URL de un fondo personalizado (subido al bucket business-logos).
alter table businesses add column if not exists theme text default 'dark';
alter table businesses add column if not exists background_url text;

-- Una cita puede incluir varios servicios. service_ids guarda la lista
-- completa (el primero se replica en service_id para compatibilidad con
-- las citas antiguas) y appointments.price guarda la suma de los precios.
alter table appointments add column if not exists service_ids jsonb;

-- Método de pago elegido al completar la cita: 'efectivo' | 'transferencia'
-- | 'tarjeta' | 'credito'
alter table invoices add column if not exists payment_method text;

-- ============================================================
-- MIGRACIÓN 003 — planes por negocio, bloqueo y pausa
-- (detalle en supabase/migrations/003_business_plans.sql).
-- Bloquear/pausar/vencer solo corta el acceso: no borra datos.
-- ============================================================

create table if not exists business_plans (
  business_id uuid primary key references businesses(id) on delete cascade,
  plan text not null default 'prueba' check (plan in ('prueba','mensual','semestral','anual')),
  starts_at timestamptz not null default now(),
  expires_at timestamptz not null,
  blocked_at timestamptz,
  paused_at timestamptz,
  reason text,
  updated_at timestamptz not null default now()
);

create index if not exists idx_business_plans_expires on business_plans(expires_at);

-- Resolución "cruda" del negocio del usuario, sin mirar el plan.
create or replace function public.resolve_business_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select business_id from business_members where user_id = auth.uid() limit 1),
    auth.uid()
  );
$$;

-- true si el negocio aún no existe (registro nuevo en la configuración
-- inicial) o si tiene un plan vigente, sin bloqueo ni pausa.
create or replace function public.business_access_active(bid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (select 1 from businesses where id = bid)
    or exists (
      select 1 from business_plans p
      where p.business_id = bid
        and p.blocked_at is null
        and p.paused_at is null
        and p.expires_at > now()
    );
$$;

alter table business_plans enable row level security;
drop policy if exists "select_own_plan" on business_plans;
create policy "select_own_plan" on business_plans for select using (business_id = resolve_business_id());

-- Prueba de 7 días para cada negocio nuevo.
create or replace function public.create_trial_plan()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into business_plans (business_id, plan, starts_at, expires_at)
  values (new.id, 'prueba', now(), now() + interval '7 days')
  on conflict (business_id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_business_trial on businesses;
create trigger trg_business_trial after insert on businesses
  for each row execute function public.create_trial_plan();

-- Negocios existentes sin plan: 7 días de prueba desde hoy, para que
-- nadie quede bloqueado al aplicar esta migración.
insert into business_plans (business_id, plan, starts_at, expires_at)
select id, 'prueba', now(), now() + interval '7 days' from businesses
on conflict (business_id) do nothing;

-- El corte de acceso se activa DESPUÉS del relleno: nunca hay un
-- instante en que un negocio existente quede sin plan.
create or replace function public.get_current_business_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select case when business_access_active(s.bid) then s.bid end
  from (select resolve_business_id() as bid) s;
$$;

grant execute on function public.get_current_business_id() to authenticated;

-- Estado de acceso del usuario actual. Usa resolve_business_id(), así
-- que responde aunque el negocio esté bloqueado (para la pantalla).
create or replace function public.get_my_business_access()
returns table (status text, plan text, expires_at timestamptz, reason text)
language sql
stable
security definer
set search_path = public
as $$
  select
    case
      when p.business_id is null and not exists (select 1 from businesses where id = s.bid) then 'new'
      when p.business_id is null then 'expired'
      when p.blocked_at is not null then 'blocked'
      when p.paused_at is not null then 'paused'
      when p.expires_at <= now() then 'expired'
      when p.plan = 'prueba' then 'trial'
      else 'active'
    end,
    p.plan, p.expires_at, p.reason
  from (select resolve_business_id() as bid) s
  left join business_plans p on p.business_id = s.bid;
$$;

revoke execute on function public.get_my_business_access() from public, anon;
grant execute on function public.get_my_business_access() to authenticated;

-- ============================================================
-- Funciones de administración — SOLO service_role (bot de Telegram)
-- ============================================================

create or replace function public.admin_list_businesses()
returns table (business_id uuid, name text, email text, plan text, expires_at timestamptz, status text, reason text)
language sql
stable
security definer
set search_path = public
as $$
  select b.id, b.name, u.email::text, p.plan, p.expires_at,
    case
      when p.business_id is null then 'sin_plan'
      when p.blocked_at is not null then 'bloqueado'
      when p.paused_at is not null then 'pausado'
      when p.expires_at <= now() then 'vencido'
      when p.plan = 'prueba' then 'prueba'
      else 'activo'
    end,
    p.reason
  from businesses b
  left join auth.users u on u.id = b.id
  left join business_plans p on p.business_id = b.id
  order by b.created_at;
$$;

create or replace function public.admin_set_plan(p_business_id uuid, p_plan text)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v_interval interval;
  v_base timestamptz := now();
  v_cur business_plans%rowtype;
  v_expires timestamptz;
begin
  v_interval := case p_plan
    when 'mensual' then interval '1 month'
    when 'semestral' then interval '6 months'
    when 'anual' then interval '1 year'
  end;
  if v_interval is null then
    raise exception 'Plan inválido: %', p_plan;
  end if;
  if not exists (select 1 from businesses where id = p_business_id) then
    raise exception 'Negocio no encontrado';
  end if;

  select * into v_cur from business_plans where business_id = p_business_id;
  -- Un plan pagado vigente se extiende; la prueba o un plan vencido cuentan desde hoy.
  if found and v_cur.plan <> 'prueba' and v_cur.expires_at > now() then
    v_base := v_cur.expires_at;
  end if;
  v_expires := v_base + v_interval;

  insert into business_plans (business_id, plan, starts_at, expires_at, updated_at)
  values (p_business_id, p_plan, now(), v_expires, now())
  on conflict (business_id) do update
    set plan = excluded.plan, starts_at = excluded.starts_at,
        expires_at = excluded.expires_at, updated_at = now();

  return v_expires;
end;
$$;

create or replace function public.admin_block_business(p_business_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update business_plans set blocked_at = now(), reason = p_reason, updated_at = now()
  where business_id = p_business_id;
  if not found then raise exception 'Negocio sin plan o inexistente'; end if;
end;
$$;

create or replace function public.admin_unblock_business(p_business_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update business_plans set blocked_at = null,
    reason = case when paused_at is null then null else reason end,
    updated_at = now()
  where business_id = p_business_id;
  if not found then raise exception 'Negocio sin plan o inexistente'; end if;
end;
$$;

create or replace function public.admin_pause_business(p_business_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update business_plans set paused_at = coalesce(paused_at, now()), reason = p_reason, updated_at = now()
  where business_id = p_business_id;
  if not found then raise exception 'Negocio sin plan o inexistente'; end if;
end;
$$;

create or replace function public.admin_resume_business(p_business_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v_expires timestamptz;
begin
  update business_plans
    set expires_at = case when paused_at is null then expires_at else expires_at + (now() - paused_at) end,
        paused_at = null,
        reason = case when blocked_at is null then null else reason end,
        updated_at = now()
  where business_id = p_business_id
  returning expires_at into v_expires;
  if not found then raise exception 'Negocio sin plan o inexistente'; end if;
  return v_expires;
end;
$$;

revoke execute on function public.admin_list_businesses() from public, anon, authenticated;
revoke execute on function public.admin_set_plan(uuid, text) from public, anon, authenticated;
revoke execute on function public.admin_block_business(uuid, text) from public, anon, authenticated;
revoke execute on function public.admin_unblock_business(uuid) from public, anon, authenticated;
revoke execute on function public.admin_pause_business(uuid, text) from public, anon, authenticated;
revoke execute on function public.admin_resume_business(uuid) from public, anon, authenticated;
revoke execute on function public.create_trial_plan() from public, anon, authenticated;
-- business_access_active solo se invoca desde get_current_business_id
-- (security definer); no hace falta exponerla por /rpc.
revoke execute on function public.business_access_active(uuid) from public, anon, authenticated;
revoke execute on function public.resolve_business_id() from public, anon;
grant execute on function public.resolve_business_id() to authenticated;
grant execute on function public.admin_list_businesses() to service_role;
grant execute on function public.admin_set_plan(uuid, text) to service_role;
grant execute on function public.admin_block_business(uuid, text) to service_role;
grant execute on function public.admin_unblock_business(uuid) to service_role;
grant execute on function public.admin_pause_business(uuid, text) to service_role;
grant execute on function public.admin_resume_business(uuid) to service_role;

-- ============================================================
-- MIGRACIÓN 004 — súper admins y vínculo con el bot de Telegram
-- (detalle en supabase/migrations/004_super_admins.sql).
-- ============================================================

create table if not exists super_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  telegram_chat_id bigint unique,
  link_code_hash text,
  link_code_expires_at timestamptz,
  created_at timestamptz not null default now()
);

alter table super_admins enable row level security;

-- Súper admin por defecto (dueño del SaaS). Idempotente; no hace nada si
-- la cuenta todavía no existe.
insert into super_admins (user_id)
select id from auth.users where lower(email) = 'marcosjimenezpolanco323@gmail.com'
on conflict (user_id) do nothing;

create or replace function public.business_access_active(bid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (select 1 from businesses where id = bid)
    or exists (select 1 from super_admins where user_id = bid)
    or exists (
      select 1 from business_plans p
      where p.business_id = bid
        and p.blocked_at is null
        and p.paused_at is null
        and p.expires_at > now()
    );
$$;

revoke execute on function public.business_access_active(uuid) from public, anon, authenticated;

drop function if exists public.get_my_business_access();
create function public.get_my_business_access()
returns table (status text, plan text, expires_at timestamptz, reason text, is_super_admin boolean)
language sql
stable
security definer
set search_path = public
as $$
  select
    case
      when exists (select 1 from super_admins where user_id = s.bid) then 'active'
      when p.business_id is null and not exists (select 1 from businesses where id = s.bid) then 'new'
      when p.business_id is null then 'expired'
      when p.blocked_at is not null then 'blocked'
      when p.paused_at is not null then 'paused'
      when p.expires_at <= now() then 'expired'
      when p.plan = 'prueba' then 'trial'
      else 'active'
    end,
    case when exists (select 1 from super_admins where user_id = s.bid) then null else p.plan end,
    case when exists (select 1 from super_admins where user_id = s.bid) then null else p.expires_at end,
    p.reason,
    exists (select 1 from super_admins where user_id = auth.uid())
  from (select resolve_business_id() as bid) s
  left join business_plans p on p.business_id = s.bid;
$$;

revoke execute on function public.get_my_business_access() from public, anon;
grant execute on function public.get_my_business_access() to authenticated;

create or replace function public.admin_list_businesses()
returns table (business_id uuid, name text, email text, plan text, expires_at timestamptz, status text, reason text)
language sql
stable
security definer
set search_path = public
as $$
  select b.id, b.name, u.email::text, p.plan, p.expires_at,
    case
      when exists (select 1 from super_admins sa where sa.user_id = b.id) then 'super_admin'
      when p.business_id is null then 'sin_plan'
      when p.blocked_at is not null then 'bloqueado'
      when p.paused_at is not null then 'pausado'
      when p.expires_at <= now() then 'vencido'
      when p.plan = 'prueba' then 'prueba'
      else 'activo'
    end,
    p.reason
  from businesses b
  left join auth.users u on u.id = b.id
  left join business_plans p on p.business_id = b.id
  order by b.created_at;
$$;

create or replace function public.admin_block_business(p_business_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from super_admins where user_id = p_business_id) then
    raise exception 'No se puede bloquear el negocio de un súper admin';
  end if;
  update business_plans set blocked_at = now(), reason = p_reason, updated_at = now()
  where business_id = p_business_id;
  if not found then raise exception 'Negocio sin plan o inexistente'; end if;
end;
$$;

create or replace function public.admin_pause_business(p_business_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from super_admins where user_id = p_business_id) then
    raise exception 'No se puede pausar el negocio de un súper admin';
  end if;
  update business_plans set paused_at = coalesce(paused_at, now()), reason = p_reason, updated_at = now()
  where business_id = p_business_id;
  if not found then raise exception 'Negocio sin plan o inexistente'; end if;
end;
$$;

-- Código de un solo uso para vincular Telegram. Solo se guarda su hash.
create or replace function public.create_telegram_link_code()
returns table (code text, expires_at timestamptz)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_code text := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
  v_expires timestamptz := now() + interval '10 minutes';
begin
  update super_admins
    set link_code_hash = encode(sha256(convert_to(v_code, 'UTF8')), 'hex'),
        link_code_expires_at = v_expires
  where user_id = auth.uid();
  if not found then
    raise exception 'Solo un súper admin puede vincular el bot';
  end if;
  return query select v_code, v_expires;
end;
$$;

revoke execute on function public.create_telegram_link_code() from public, anon;
grant execute on function public.create_telegram_link_code() to authenticated;

create or replace function public.admin_link_telegram(p_code text, p_chat_id bigint)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid;
  v_email text;
begin
  select user_id into v_user from super_admins
  where link_code_hash = encode(sha256(convert_to(upper(trim(p_code)), 'UTF8')), 'hex')
    and link_code_expires_at > now();
  if v_user is null then
    raise exception 'Código inválido o vencido';
  end if;

  update super_admins set telegram_chat_id = null where telegram_chat_id = p_chat_id and user_id <> v_user;
  update super_admins
    set telegram_chat_id = p_chat_id, link_code_hash = null, link_code_expires_at = null
  where user_id = v_user;

  select email::text into v_email from auth.users where id = v_user;
  return v_email;
end;
$$;

create or replace function public.admin_chat_is_super_admin(p_chat_id bigint)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from super_admins where telegram_chat_id = p_chat_id);
$$;

revoke execute on function public.admin_list_businesses() from public, anon, authenticated;
revoke execute on function public.admin_block_business(uuid, text) from public, anon, authenticated;
revoke execute on function public.admin_pause_business(uuid, text) from public, anon, authenticated;
revoke execute on function public.admin_link_telegram(text, bigint) from public, anon, authenticated;
revoke execute on function public.admin_chat_is_super_admin(bigint) from public, anon, authenticated;
grant execute on function public.admin_list_businesses() to service_role;
grant execute on function public.admin_block_business(uuid, text) to service_role;
grant execute on function public.admin_pause_business(uuid, text) to service_role;
grant execute on function public.admin_link_telegram(text, bigint) to service_role;
grant execute on function public.admin_chat_is_super_admin(bigint) to service_role;

-- ============================================================
-- MIGRACIÓN 005 — módulos por negocio, estadísticas y eliminación
-- (detalle en supabase/migrations/005_modules_and_deletion.sql).
-- ============================================================

create table if not exists business_module_overrides (
  business_id uuid not null references businesses(id) on delete cascade,
  module text not null check (module in ('facturas','equipo','estadisticas')),
  enabled boolean not null,
  updated_at timestamptz not null default now(),
  primary key (business_id, module)
);
alter table business_module_overrides enable row level security;

create table if not exists pending_deletions (
  business_id uuid primary key references businesses(id) on delete cascade,
  code_hash text not null,
  chat_id bigint not null,
  expires_at timestamptz not null
);
alter table pending_deletions enable row level security;

-- Módulos incluidos por plan. Hoy todos los planes traen todo; para
-- seguir la landing (p. ej. Mensual sin equipo ni estadisticas) basta
-- con cambiar esta función.
create or replace function public.plan_default_modules(p_plan text)
returns text[]
language sql
immutable
as $$
  select array['facturas','equipo','estadisticas'];
$$;

create or replace function public.business_module_enabled(bid uuid, p_module text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when exists (select 1 from super_admins where user_id = bid) then true
    else coalesce(
      (select enabled from business_module_overrides where business_id = bid and module = p_module),
      p_module = any(plan_default_modules(coalesce((select plan from business_plans where business_id = bid), 'prueba')))
    )
  end;
$$;

create or replace function public.current_business_has_module(p_module text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select business_module_enabled(resolve_business_id(), p_module);
$$;

create or replace function public.get_current_business_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select case
    when not business_access_active(s.bid) then null
    when s.bid <> auth.uid() and not business_module_enabled(s.bid, 'equipo') then null
    else s.bid
  end
  from (select resolve_business_id() as bid) s;
$$;

grant execute on function public.get_current_business_id() to authenticated;

drop function if exists public.get_my_business_access();
create function public.get_my_business_access()
returns table (status text, plan text, expires_at timestamptz, reason text, is_super_admin boolean, modules text[])
language sql
stable
security definer
set search_path = public
as $$
  select
    case
      when exists (select 1 from super_admins where user_id = s.bid) then 'active'
      when p.business_id is null and not exists (select 1 from businesses where id = s.bid) then 'new'
      when s.bid <> auth.uid() and not business_module_enabled(s.bid, 'equipo') then 'blocked'
      when p.business_id is null then 'expired'
      when p.blocked_at is not null then 'blocked'
      when p.paused_at is not null then 'paused'
      when p.expires_at <= now() then 'expired'
      when p.plan = 'prueba' then 'trial'
      else 'active'
    end,
    case when exists (select 1 from super_admins where user_id = s.bid) then null else p.plan end,
    case when exists (select 1 from super_admins where user_id = s.bid) then null else p.expires_at end,
    case
      when s.bid <> auth.uid() and not business_module_enabled(s.bid, 'equipo')
        then 'El acceso de empleados no está activo en este negocio'
      else p.reason
    end,
    exists (select 1 from super_admins where user_id = auth.uid()),
    array(
      select m from unnest(array['facturas','equipo','estadisticas']) m
      where business_module_enabled(s.bid, m)
    )
  from (select resolve_business_id() as bid) s
  left join business_plans p on p.business_id = s.bid;
$$;

revoke execute on function public.get_my_business_access() from public, anon;
grant execute on function public.get_my_business_access() to authenticated;

-- facturas: invoices y customer_credits exigen el módulo
drop policy if exists "select_invoices" on invoices;
drop policy if exists "admin_insert_invoices" on invoices;
drop policy if exists "admin_update_invoices" on invoices;
drop policy if exists "admin_delete_invoices" on invoices;
create policy "select_invoices" on invoices for select
  using (business_id = get_current_business_id() and current_business_has_module('facturas'));
create policy "admin_insert_invoices" on invoices for insert
  with check (business_id = get_current_business_id() and is_current_business_admin() and current_business_has_module('facturas'));
create policy "admin_update_invoices" on invoices for update
  using (business_id = get_current_business_id() and is_current_business_admin() and current_business_has_module('facturas'))
  with check (business_id = get_current_business_id() and is_current_business_admin() and current_business_has_module('facturas'));
create policy "admin_delete_invoices" on invoices for delete
  using (business_id = get_current_business_id() and is_current_business_admin() and current_business_has_module('facturas'));

drop policy if exists "select_credits" on customer_credits;
drop policy if exists "admin_insert_credits" on customer_credits;
drop policy if exists "admin_update_credits" on customer_credits;
drop policy if exists "admin_delete_credits" on customer_credits;
create policy "select_credits" on customer_credits for select
  using (business_id = get_current_business_id() and current_business_has_module('facturas'));
create policy "admin_insert_credits" on customer_credits for insert
  with check (business_id = get_current_business_id() and is_current_business_admin() and current_business_has_module('facturas'));
create policy "admin_update_credits" on customer_credits for update
  using (business_id = get_current_business_id() and is_current_business_admin() and current_business_has_module('facturas'))
  with check (business_id = get_current_business_id() and is_current_business_admin() and current_business_has_module('facturas'));
create policy "admin_delete_credits" on customer_credits for delete
  using (business_id = get_current_business_id() and is_current_business_admin() and current_business_has_module('facturas'));

-- equipo: invitaciones solo con el módulo activo
drop policy if exists "admin_manage_invites" on employee_invites;
create policy "admin_manage_invites" on employee_invites for all
  using (business_id = auth.uid() and current_business_has_module('equipo'))
  with check (business_id = auth.uid() and current_business_has_module('equipo'));

create or replace function public.redeem_invite_code(input_code text, input_employee_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_id uuid;
  v_expires_at timestamptz;
begin
  select business_id, expires_at into v_business_id, v_expires_at
  from employee_invites
  where code = input_code and used = false
  limit 1;

  if v_business_id is null then
    raise exception 'Código de invitación inválido o ya utilizado';
  end if;

  if v_expires_at is not null and v_expires_at <= now() then
    raise exception 'El código de invitación venció. Pide al administrador que genere uno nuevo';
  end if;

  if not business_module_enabled(v_business_id, 'equipo') then
    raise exception 'Este negocio no tiene activo el acceso de empleados';
  end if;

  insert into business_members (business_id, user_id, role, employee_name)
  values (v_business_id, auth.uid(), 'employee', input_employee_name)
  on conflict (business_id, user_id) do nothing;

  update employee_invites
    set used = true, used_by = auth.uid(), used_at = now()
    where code = input_code;

  return v_business_id;
end;
$$;

grant execute on function public.redeem_invite_code(text, text) to authenticated;

-- ============================================================
-- Funciones de administración — SOLO service_role (bot)
-- ============================================================

create or replace function public.admin_list_modules(p_business_id uuid)
returns table (module text, enabled boolean, origen text)
language sql
stable
security definer
set search_path = public
as $$
  select m,
    business_module_enabled(p_business_id, m),
    case
      when exists (select 1 from super_admins where user_id = p_business_id) then 'super_admin'
      when exists (select 1 from business_module_overrides o where o.business_id = p_business_id and o.module = m) then 'manual'
      else 'plan'
    end
  from unnest(array['facturas','equipo','estadisticas']) m;
$$;

create or replace function public.admin_set_module(p_business_id uuid, p_module text, p_enabled boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_module not in ('facturas','equipo','estadisticas') then
    raise exception 'Módulo inválido: %', p_module;
  end if;
  if not exists (select 1 from businesses where id = p_business_id) then
    raise exception 'Negocio no encontrado';
  end if;
  insert into business_module_overrides (business_id, module, enabled, updated_at)
  values (p_business_id, p_module, p_enabled, now())
  on conflict (business_id, module) do update set enabled = excluded.enabled, updated_at = now();
end;
$$;

create or replace function public.admin_business_stats(p_business_id uuid)
returns table (clientes bigint, citas bigint, facturas bigint, servicios bigint, empleados bigint, ultima_actividad timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select
    (select count(*) from customers where business_id = p_business_id),
    (select count(*) from appointments where business_id = p_business_id),
    (select count(*) from invoices where business_id = p_business_id),
    (select count(*) from services where business_id = p_business_id),
    (select count(*) from business_members where business_id = p_business_id),
    greatest(
      (select max(created_at) from activity_log where business_id = p_business_id),
      (select max(created_at) from appointments where business_id = p_business_id)
    );
$$;

create or replace function public.admin_prepare_delete(p_business_id uuid, p_chat_id bigint)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
  v_plan business_plans%rowtype;
begin
  if exists (select 1 from super_admins where user_id = p_business_id) then
    raise exception 'No se puede eliminar el negocio de un súper admin';
  end if;
  if not exists (select 1 from businesses where id = p_business_id) then
    raise exception 'Negocio no encontrado';
  end if;
  select * into v_plan from business_plans where business_id = p_business_id;
  if found and v_plan.blocked_at is null and v_plan.expires_at > now() then
    raise exception 'Solo se eliminan cuentas bloqueadas o vencidas. Primero usa /bloquear';
  end if;

  insert into pending_deletions (business_id, code_hash, chat_id, expires_at)
  values (p_business_id, encode(sha256(convert_to(v_code, 'UTF8')), 'hex'), p_chat_id, now() + interval '5 minutes')
  on conflict (business_id) do update
    set code_hash = excluded.code_hash, chat_id = excluded.chat_id, expires_at = excluded.expires_at;
  return v_code;
end;
$$;

-- Borra el negocio (cascada: citas, clientes, facturas, créditos,
-- servicios, empleados, plan, módulos, actividad) y devuelve los usuarios
-- de Auth que la Edge Function debe borrar: el dueño y los empleados que
-- no pertenecen a otro negocio.
create or replace function public.admin_execute_delete(p_code text, p_chat_id bigint)
returns table (business_id uuid, name text, user_ids uuid[])
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_bid uuid;
  v_name text;
  v_users uuid[];
  v_plan business_plans%rowtype;
begin
  select pd.business_id into v_bid from pending_deletions pd
  where pd.code_hash = encode(sha256(convert_to(upper(trim(p_code)), 'UTF8')), 'hex')
    and pd.chat_id = p_chat_id
    and pd.expires_at > now();
  if v_bid is null then
    raise exception 'Código inválido o vencido';
  end if;

  if exists (select 1 from super_admins where user_id = v_bid) then
    raise exception 'No se puede eliminar el negocio de un súper admin';
  end if;
  select * into v_plan from business_plans bp where bp.business_id = v_bid;
  if found and v_plan.blocked_at is null and v_plan.expires_at > now() then
    raise exception 'La cuenta ya no está bloqueada ni vencida; eliminación cancelada';
  end if;

  select b.name into v_name from businesses b where b.id = v_bid;
  select coalesce(array_agg(u), '{}') into v_users from (
    select v_bid as u where exists (select 1 from auth.users where id = v_bid)
    union
    select bm.user_id from business_members bm
    where bm.business_id = v_bid
      and not exists (select 1 from business_members o where o.user_id = bm.user_id and o.business_id <> v_bid)
      and not exists (select 1 from businesses b where b.id = bm.user_id)
      and not exists (select 1 from super_admins sa where sa.user_id = bm.user_id)
  ) x;

  delete from businesses where id = v_bid;
  return query select v_bid, v_name, v_users;
end;
$$;

revoke execute on function public.plan_default_modules(text) from public, anon;
revoke execute on function public.business_module_enabled(uuid, text) from public, anon, authenticated;
revoke execute on function public.current_business_has_module(text) from public, anon;
grant execute on function public.current_business_has_module(text) to authenticated;
revoke execute on function public.admin_list_modules(uuid) from public, anon, authenticated;
revoke execute on function public.admin_set_module(uuid, text, boolean) from public, anon, authenticated;
revoke execute on function public.admin_business_stats(uuid) from public, anon, authenticated;
revoke execute on function public.admin_prepare_delete(uuid, bigint) from public, anon, authenticated;
revoke execute on function public.admin_execute_delete(text, bigint) from public, anon, authenticated;
grant execute on function public.admin_list_modules(uuid) to service_role;
grant execute on function public.admin_set_module(uuid, text, boolean) to service_role;
grant execute on function public.admin_business_stats(uuid) to service_role;
grant execute on function public.admin_prepare_delete(uuid, bigint) to service_role;
grant execute on function public.admin_execute_delete(text, bigint) to service_role;

-- ============================================================
-- MIGRACIÓN 006 — días de prueba por plan
-- (detalle en supabase/migrations/006_trial_per_plan.sql).
-- ============================================================

alter table business_plans add column if not exists trial_plan text
  check (trial_plan in ('mensual','semestral','anual'));

create or replace function public.plan_trial_days(p_plan text)
returns int
language sql
immutable
as $$
  select case p_plan
    when 'mensual' then 10
    when 'semestral' then 20
    when 'anual' then 30
  end;
$$;

-- Lógica común: extiende la prueba hasta registro + días del plan.
create or replace function public.apply_trial_plan(p_business_id uuid, p_plan text)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v_days int := plan_trial_days(p_plan);
  v_created timestamptz;
  v_cur business_plans%rowtype;
  v_expires timestamptz;
begin
  if v_days is null then
    raise exception 'Plan inválido: %', p_plan;
  end if;
  select created_at into v_created from businesses where id = p_business_id;
  if v_created is null then
    raise exception 'Negocio no encontrado';
  end if;
  select * into v_cur from business_plans where business_id = p_business_id;
  if not found or v_cur.plan <> 'prueba' then
    raise exception 'Solo se puede elegir una prueba mientras la cuenta está en prueba';
  end if;
  if v_cur.blocked_at is not null or v_cur.paused_at is not null then
    raise exception 'La cuenta está bloqueada o pausada';
  end if;

  v_expires := greatest(v_cur.expires_at, v_created + make_interval(days => v_days));
  if v_expires <= now() then
    raise exception 'Ya se consumieron los % días de prueba del plan %', v_days, p_plan;
  end if;

  update business_plans
    set trial_plan = p_plan, expires_at = v_expires, updated_at = now()
  where business_id = p_business_id;
  return v_expires;
end;
$$;

-- El dueño del negocio elige su plan de prueba (una sola vez).
create or replace function public.choose_trial_plan(p_plan text)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from businesses where id = auth.uid()) then
    raise exception 'Solo el dueño del negocio puede elegir la prueba';
  end if;
  if exists (select 1 from business_plans where business_id = auth.uid() and trial_plan is not null) then
    raise exception 'La prueba de un plan ya fue elegida';
  end if;
  return apply_trial_plan(auth.uid(), p_plan);
end;
$$;

create or replace function public.admin_set_trial(p_business_id uuid, p_plan text)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
begin
  return apply_trial_plan(p_business_id, p_plan);
end;
$$;

drop function if exists public.get_my_business_access();
create function public.get_my_business_access()
returns table (
  status text, plan text, expires_at timestamptz, reason text,
  is_super_admin boolean, modules text[], trial_plan text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    case
      when exists (select 1 from super_admins where user_id = s.bid) then 'active'
      when p.business_id is null and not exists (select 1 from businesses where id = s.bid) then 'new'
      when s.bid <> auth.uid() and not business_module_enabled(s.bid, 'equipo') then 'blocked'
      when p.business_id is null then 'expired'
      when p.blocked_at is not null then 'blocked'
      when p.paused_at is not null then 'paused'
      when p.expires_at <= now() then 'expired'
      when p.plan = 'prueba' then 'trial'
      else 'active'
    end,
    case when exists (select 1 from super_admins where user_id = s.bid) then null else p.plan end,
    case when exists (select 1 from super_admins where user_id = s.bid) then null else p.expires_at end,
    case
      when s.bid <> auth.uid() and not business_module_enabled(s.bid, 'equipo')
        then 'El acceso de empleados no está activo en este negocio'
      else p.reason
    end,
    exists (select 1 from super_admins where user_id = auth.uid()),
    array(
      select m from unnest(array['facturas','equipo','estadisticas']) m
      where business_module_enabled(s.bid, m)
    ),
    p.trial_plan
  from (select resolve_business_id() as bid) s
  left join business_plans p on p.business_id = s.bid;
$$;

revoke execute on function public.get_my_business_access() from public, anon;
grant execute on function public.get_my_business_access() to authenticated;

create or replace function public.admin_list_businesses()
returns table (business_id uuid, name text, email text, plan text, expires_at timestamptz, status text, reason text)
language sql
stable
security definer
set search_path = public
as $$
  select b.id, b.name, u.email::text,
    case when p.plan = 'prueba' and p.trial_plan is not null then 'prueba (' || p.trial_plan || ')' else p.plan end,
    p.expires_at,
    case
      when exists (select 1 from super_admins sa where sa.user_id = b.id) then 'super_admin'
      when p.business_id is null then 'sin_plan'
      when p.blocked_at is not null then 'bloqueado'
      when p.paused_at is not null then 'pausado'
      when p.expires_at <= now() then 'vencido'
      when p.plan = 'prueba' then 'prueba'
      else 'activo'
    end,
    p.reason
  from businesses b
  left join auth.users u on u.id = b.id
  left join business_plans p on p.business_id = b.id
  order by b.created_at;
$$;

revoke execute on function public.plan_trial_days(text) from public, anon;
revoke execute on function public.apply_trial_plan(uuid, text) from public, anon, authenticated;
revoke execute on function public.choose_trial_plan(text) from public, anon;
grant execute on function public.choose_trial_plan(text) to authenticated;
revoke execute on function public.admin_set_trial(uuid, text) from public, anon, authenticated;
revoke execute on function public.admin_list_businesses() from public, anon, authenticated;
grant execute on function public.admin_set_trial(uuid, text) to service_role;
grant execute on function public.admin_list_businesses() to service_role;

-- ============================================================
-- MIGRACIÓN 007 — plan Anual = 13 meses (1 mes gratis)
-- (detalle en supabase/migrations/007_annual_bonus_month.sql).
-- ============================================================

create or replace function public.admin_set_plan(p_business_id uuid, p_plan text)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v_interval interval;
  v_base timestamptz := now();
  v_cur business_plans%rowtype;
  v_expires timestamptz;
begin
  v_interval := case p_plan
    when 'mensual' then interval '1 month'
    when 'semestral' then interval '6 months'
    when 'anual' then interval '13 months'
  end;
  if v_interval is null then
    raise exception 'Plan inválido: %', p_plan;
  end if;
  if not exists (select 1 from businesses where id = p_business_id) then
    raise exception 'Negocio no encontrado';
  end if;

  select * into v_cur from business_plans where business_id = p_business_id;
  -- Un plan pagado vigente se extiende; la prueba o un plan vencido cuentan desde hoy.
  if found and v_cur.plan <> 'prueba' and v_cur.expires_at > now() then
    v_base := v_cur.expires_at;
  end if;
  v_expires := v_base + v_interval;

  insert into business_plans (business_id, plan, starts_at, expires_at, updated_at)
  values (p_business_id, p_plan, now(), v_expires, now())
  on conflict (business_id) do update
    set plan = excluded.plan, starts_at = excluded.starts_at,
        expires_at = excluded.expires_at, updated_at = now();

  return v_expires;
end;
$$;

revoke execute on function public.admin_set_plan(uuid, text) from public, anon, authenticated;
grant execute on function public.admin_set_plan(uuid, text) to service_role;

-- ============================================================
-- MIGRACIÓN 008 — límite de clientes por plan y aviso de registros
-- (detalle en supabase/migrations/008_customer_limits_and_signup_alerts.sql).
-- ============================================================

create or replace function public.plan_customer_limit(p_plan text)
returns int
language sql
immutable
as $$
  select case p_plan
    when 'mensual' then 15
    when 'semestral' then 90
    else null
  end;
$$;

create or replace function public.business_customer_limit(bid uuid)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select case
    when exists (select 1 from super_admins where user_id = bid) then null
    else (
      select plan_customer_limit(case when p.plan = 'prueba' then coalesce(p.trial_plan, 'mensual') else p.plan end)
      from business_plans p where p.business_id = bid
    )
  end;
$$;

create or replace function public.enforce_customer_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit int := business_customer_limit(new.business_id);
begin
  if v_limit is not null
     and (select count(*) from customers where business_id = new.business_id) >= v_limit then
    raise exception 'CUSTOMER_LIMIT:%', v_limit;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_customer_limit on customers;
create trigger trg_customer_limit before insert on customers
  for each row execute function public.enforce_customer_limit();

alter table business_plans add column if not exists signup_notified_at timestamptz;

-- Devuelve los datos del registro y lo marca como avisado, una sola vez.
-- Sin filas = nada que avisar (sin negocio, sin configurar o ya avisado).
create or replace function public.admin_claim_signup_notification(p_user uuid)
returns table (
  name text, email text, business_type text, team_size int,
  trial_plan text, expires_at timestamptz, chat_ids bigint[]
)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
begin
  update business_plans bp set signup_notified_at = now()
  where bp.business_id = p_user
    and bp.signup_notified_at is null
    and exists (select 1 from businesses b where b.id = p_user and b.onboarding_completed);
  if not found then
    return;
  end if;

  return query
  select b.name, u.email::text, b.business_type, b.team_size, bp.trial_plan, bp.expires_at,
    array(select sa.telegram_chat_id from super_admins sa where sa.telegram_chat_id is not null)
  from businesses b
  join auth.users u on u.id = b.id
  join business_plans bp on bp.business_id = b.id
  where b.id = p_user;
end;
$$;

-- Si Telegram falla, se desmarca para que el próximo intento vuelva a avisar.
create or replace function public.admin_reset_signup_notification(p_user uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update business_plans set signup_notified_at = null where business_id = p_user;
$$;

-- Los negocios que ya existían no se avisan.
update business_plans set signup_notified_at = now() where signup_notified_at is null;

revoke execute on function public.plan_customer_limit(text) from public, anon;
revoke execute on function public.business_customer_limit(uuid) from public, anon, authenticated;
revoke execute on function public.enforce_customer_limit() from public, anon, authenticated;
revoke execute on function public.admin_claim_signup_notification(uuid) from public, anon, authenticated;
revoke execute on function public.admin_reset_signup_notification(uuid) from public, anon, authenticated;
grant execute on function public.admin_claim_signup_notification(uuid) to service_role;
grant execute on function public.admin_reset_signup_notification(uuid) to service_role;

-- ============================================================
-- MIGRACIÓN 009 — solo el plan Mensual tiene prueba gratis
-- (detalle en supabase/migrations/009_trial_only_mensual.sql).
-- ============================================================

create or replace function public.choose_trial_plan(p_plan text)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_plan <> 'mensual' then
    raise exception 'Solo el plan Mensual tiene prueba gratis';
  end if;
  if not exists (select 1 from businesses where id = auth.uid()) then
    raise exception 'Solo el dueño del negocio puede elegir la prueba';
  end if;
  if exists (select 1 from business_plans where business_id = auth.uid() and trial_plan is not null) then
    raise exception 'La prueba de un plan ya fue elegida';
  end if;
  return apply_trial_plan(auth.uid(), p_plan);
end;
$$;

revoke execute on function public.choose_trial_plan(text) from public, anon;
grant execute on function public.choose_trial_plan(text) to authenticated;

-- ============================================================
-- MIGRACIÓN 010 — cambio de plan inmediato (/cambiar) y /plan solo renueva
-- (detalle en supabase/migrations/010_change_plan.sql).
-- ============================================================

create or replace function public.admin_change_plan(p_business_id uuid, p_plan text)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cur business_plans%rowtype;
  v_limit int := plan_customer_limit(p_plan);
  v_customers int;
begin
  if p_plan not in ('mensual', 'semestral', 'anual') then
    raise exception 'Plan inválido: %', p_plan;
  end if;
  select * into v_cur from business_plans where business_id = p_business_id;
  if not found then
    raise exception 'Negocio sin plan o inexistente';
  end if;
  if v_cur.plan = 'prueba' or v_cur.expires_at <= now() then
    raise exception 'Solo se cambia un plan pagado vigente. Para una cuenta en prueba o vencida usa /plan';
  end if;
  if v_cur.plan = p_plan then
    raise exception 'El negocio ya tiene el plan %', p_plan;
  end if;

  select count(*) into v_customers from customers where business_id = p_business_id;
  if v_limit is not null and v_customers > v_limit then
    raise exception 'Tiene % clientes y el plan % permite %: le sobran %', v_customers, p_plan, v_limit, v_customers - v_limit;
  end if;

  update business_plans set plan = p_plan, updated_at = now() where business_id = p_business_id;
  return v_cur.expires_at;
end;
$$;

revoke execute on function public.admin_change_plan(uuid, text) from public, anon, authenticated;
grant execute on function public.admin_change_plan(uuid, text) to service_role;

create or replace function public.admin_set_plan(p_business_id uuid, p_plan text)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v_interval interval;
  v_base timestamptz := now();
  v_cur business_plans%rowtype;
  v_expires timestamptz;
begin
  v_interval := case p_plan
    when 'mensual' then interval '1 month'
    when 'semestral' then interval '6 months'
    when 'anual' then interval '13 months'
  end;
  if v_interval is null then
    raise exception 'Plan inválido: %', p_plan;
  end if;
  if not exists (select 1 from businesses where id = p_business_id) then
    raise exception 'Negocio no encontrado';
  end if;

  select * into v_cur from business_plans where business_id = p_business_id;
  if found and v_cur.plan <> 'prueba' and v_cur.expires_at > now() then
    if v_cur.plan <> p_plan then
      raise exception 'Tiene el plan % vigente. /plan solo renueva el mismo plan; para cambiarlo usa /cambiar', v_cur.plan;
    end if;
    v_base := v_cur.expires_at;
  end if;
  v_expires := v_base + v_interval;

  insert into business_plans (business_id, plan, starts_at, expires_at, updated_at)
  values (p_business_id, p_plan, now(), v_expires, now())
  on conflict (business_id) do update
    set plan = excluded.plan, starts_at = excluded.starts_at,
        expires_at = excluded.expires_at, updated_at = now();

  return v_expires;
end;
$$;

revoke execute on function public.admin_set_plan(uuid, text) from public, anon, authenticated;
grant execute on function public.admin_set_plan(uuid, text) to service_role;

-- ============================================================
-- FIN DEL SCRIPT
-- Recuerda: en el HTML, reemplaza SUPABASE_URL y SUPABASE_ANON_KEY
-- con las credenciales de tu proyecto (Project Settings > API).
-- ============================================================
