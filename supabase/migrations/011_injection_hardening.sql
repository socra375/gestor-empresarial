-- ============================================================
-- 011 — Endurecimiento contra inyección y abuso
-- ============================================================
-- Qué cambia (se puede ejecutar varias veces):
-- * plan_customer_limit / plan_default_modules / plan_trial_days fijan
--   search_path: sin eso, quien pudiera crear objetos en otro esquema
--   podría "colarse" en las funciones que las llaman.
-- * get_current_business_id, is_current_business_admin y
--   redeem_invite_code dejan de poder llamarse sin iniciar sesión (rol
--   anon). La app solo las usa con sesión; sin esto, cualquiera podía
--   probar códigos de invitación por /rest/v1/rpc y distinguir los
--   válidos por el mensaje de error.
-- * redeem_invite_code exige sesión y un nombre de 1 a 120 caracteres.
--
-- Toda la app consulta con parámetros (supabase-js / PostgREST) y
-- ninguna función arma SQL con texto del usuario (sin EXECUTE/format),
-- así que no hay inyección SQL posible; esto cierra lo que quedaba.
-- ============================================================

alter function public.plan_customer_limit(text) set search_path = public;
alter function public.plan_default_modules(text) set search_path = public;
alter function public.plan_trial_days(text) set search_path = public;

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
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión para usar un código de invitación';
  end if;

  if input_employee_name is null or length(btrim(input_employee_name)) = 0 or length(input_employee_name) > 120 then
    raise exception 'El nombre debe tener entre 1 y 120 caracteres';
  end if;

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
  values (v_business_id, auth.uid(), 'employee', btrim(input_employee_name))
  on conflict (business_id, user_id) do nothing;

  update employee_invites
    set used = true, used_by = auth.uid(), used_at = now()
    where code = input_code;

  return v_business_id;
end;
$$;

revoke execute on function public.get_current_business_id() from public, anon;
revoke execute on function public.is_current_business_admin() from public, anon;
revoke execute on function public.redeem_invite_code(text, text) from public, anon;
grant execute on function public.get_current_business_id() to authenticated;
grant execute on function public.is_current_business_admin() to authenticated;
grant execute on function public.redeem_invite_code(text, text) to authenticated;
