-- ============================================================
-- 005 — Módulos por negocio, estadísticas y eliminación de cuentas
-- ============================================================
-- Qué cambia:
--   * Módulos (según la landing): facturas (incluye PDF y créditos),
--     equipo (empleados e invitaciones) y estadisticas (Inicio).
--     Cada plan trae módulos por defecto (plan_default_modules; hoy
--     todos traen todo) y el súper admin puede forzar uno por negocio
--     (business_module_overrides). Apagar un módulo OCULTA sus datos,
--     no los borra: vuelven al encenderlo.
--       - facturas: RLS de invoices y customer_credits lo exige.
--       - equipo: los empleados pierden el acceso (get_current_business_id
--         devuelve NULL para ellos) y no se pueden crear ni canjear
--         invitaciones.
--       - estadisticas: solo se oculta en la app; sus datos vienen de las
--         mismas tablas que Agenda y Facturas, no hay nada que bloquear.
--   * admin_business_stats: cantidades (clientes, citas, facturas…) para
--     el bot; nunca expone datos personales de los clientes del salón.
--   * Eliminación de cuentas en dos pasos (admin_prepare_delete →
--     admin_execute_delete) con código de 5 minutos, solo para cuentas
--     bloqueadas o vencidas y nunca para un súper admin. BORRA TODO el
--     negocio (cascada). Los usuarios de Auth y los logos los borra la
--     Edge Function con las APIs de Auth y Storage.
--
-- Antes de aplicar: backup desde Supabase → Database → Backups.
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
-- VERIFICACIÓN — módulos de cada negocio
-- ============================================================
select b.name, m.module, m.enabled, m.origen
from businesses b, lateral admin_list_modules(b.id) m
order by b.created_at, m.module;
