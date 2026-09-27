-- ============================================================
-- 008 — Límite de clientes por plan y aviso de registros nuevos
-- ============================================================
-- Qué cambia:
--   * Límite de clientes según la landing (se toma el tope del rango):
--     Mensual 15 ("hasta 10–15"), Semestral 90 ("hasta 50–90"),
--     Anual sin límite ("más de 150"). En prueba vale el límite del
--     plan que se está probando; la prueba genérica de 7 días usa el
--     de Mensual. El súper admin no tiene límite.
--     Un trigger BEFORE INSERT en customers lo hace cumplir (también por
--     API). No toca a los clientes que ya existen: solo impide agregar.
--     El error es 'CUSTOMER_LIMIT:<n>' para que la app lo traduzca.
--   * business_plans.signup_notified_at + admin_claim_signup_notification:
--     la Edge Function notify-signup avisa por Telegram al súper admin
--     una sola vez por negocio, cuando termina la configuración inicial.
--
-- Antes de aplicar: backup desde Supabase → Database → Backups.
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
-- VERIFICACIÓN — límite efectivo de cada negocio
-- ============================================================
select b.name, business_customer_limit(b.id) as limite, (select count(*) from customers c where c.business_id = b.id) as clientes
from businesses b order by b.created_at;
