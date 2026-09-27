-- ============================================================
-- 007 — Plan Anual = 12 meses + 1 mes gratis (13 meses)
-- ============================================================
-- Qué cambia: admin_set_plan('anual') suma 13 meses en lugar de 12, como
-- promete la landing ("Incluye 1 mes gratis · $15.38/mes" = $200 / 13).
-- El mes de regalo de los negocios que ya tenían Anual se ajusta aparte
-- (dato puntual), no en esta migración.
--
-- Antes de aplicar: backup desde Supabase → Database → Backups.
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
-- VERIFICACIÓN — la función debe usar 13 meses para anual
-- ============================================================
select position('13 months' in pg_get_functiondef('public.admin_set_plan(uuid,text)'::regprocedure)) > 0 as anual_13_meses;
