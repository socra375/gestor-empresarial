-- ============================================================
-- 006 — Días de prueba por plan (según la landing)
-- ============================================================
-- Qué cambia:
--   * Al registrarse, todo negocio tiene 7 días de prueba (migración 003).
--   * Si elige probar un plan, su prueba TOTAL pasa a ser la de ese plan,
--     contada desde el registro (businesses.created_at): los días ya
--     usados se restan. Mensual 10, Semestral 20, Anual 30.
--     Ej.: elige Semestral el día 7 → le quedan 13 días.
--   * El cliente puede elegirlo una sola vez desde la app
--     (choose_trial_plan). El súper admin puede aplicarlo o corregirlo
--     siempre desde el bot (admin_set_trial).
--   * Nunca acorta una prueba ya otorgada, y solo aplica a negocios que
--     siguen en prueba (no a un plan pagado, bloqueado ni pausado).
--
-- Antes de aplicar: backup desde Supabase → Database → Backups.
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
-- VERIFICACIÓN — días de prueba por plan
-- ============================================================
select p, plan_trial_days(p) from unnest(array['mensual','semestral','anual']) p;
