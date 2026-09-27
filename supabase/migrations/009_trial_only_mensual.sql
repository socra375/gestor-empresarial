-- ============================================================
-- 009 — Solo el plan Mensual tiene prueba gratis
-- ============================================================
-- Qué cambia: choose_trial_plan (la que usa el cliente desde la app)
-- solo acepta 'mensual'. Semestral y Anual se contratan, no se prueban.
-- admin_set_trial (bot /prueba) sigue aceptando los tres planes, como
-- excepción manual del súper admin.
--
-- Antes de aplicar: backup desde Supabase → Database → Backups.
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
