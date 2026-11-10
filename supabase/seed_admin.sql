-- Yetta Holding Reporting Portal — Seed Default Admin Account
-- Email: admin@yetta-holding.com
-- Password: YettaAdmin2026!

create extension if not exists "pgcrypto";

do $$
declare
  v_user_id uuid := 'a0000000-0000-0000-0000-000000000001';
  v_email text := 'admin@yetta-holding.com';
  v_password text := 'YettaAdmin2026!';
  v_encrypted_pw text;
begin
  -- Generate bcrypt hash
  v_encrypted_pw := crypt(v_password, gen_salt('bf'));

  -- Check if user already exists
  if not exists (select 1 from auth.users where email = v_email) then
    insert into auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      role,
      confirmation_token
    ) values (
      v_user_id,
      '00000000-0000-0000-0000-000000000000',
      v_email,
      v_encrypted_pw,
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Executive Administrator","department":"Executive Management"}',
      now(),
      now(),
      'authenticated',
      ''
    );
  else
    update auth.users
    set encrypted_password = v_encrypted_pw,
        email_confirmed_at = coalesce(email_confirmed_at, now())
    where email = v_email;
    select id into v_user_id from auth.users where email = v_email;
  end if;

  -- Ensure profile exists with 'admin' role
  insert into public.profiles (id, full_name, department, role)
  values (v_user_id, 'Executive Administrator', 'Executive Management', 'admin')
  on conflict (id) do update
  set role = 'admin',
      full_name = 'Executive Administrator',
      department = 'Executive Management';

  raise notice 'Admin account successfully seeded: % with password %', v_email, v_password;
end $$;

