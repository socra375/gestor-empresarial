-- ============================================================
-- 010 — Cambio de plan inmediato (bot /cambiar)
-- ============================================================
-- Qué cambia: admin_change_plan cambia el plan pagado de un negocio en
-- el momento (p. ej. Anual → Mensual) CONSERVANDO su fecha de
-- vencimiento: no se pierde ni se regala tiempo pagado; al vencer se
-- renueva con /plan. Se rechaza si el negocio tiene más clientes que el
-- límite del plan nuevo, si está en prueba o vencido (para eso /plan o
-- /prueba), o si ya tiene ese plan.
-- admin_set_plan (/plan) ahora rechaza un plan DISTINTO al vigente: antes
-- sumaba el tiempo y cambiaba la etiqueta (un Anual con /plan semestral
-- quedaba con 13 + 6 meses). /plan solo renueva el mismo plan.
--
-- Antes de aplicar: backup desde Supabase → Database → Backups.
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
