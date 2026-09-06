-- Prevent clients from self-escalating admin or hijacking Telegram/Gmail linkage.

create or replace function public.protect_profile_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;

  new.is_admin := old.is_admin;
  new.telegram_chat_id := old.telegram_chat_id;
  new.gmail_address := old.gmail_address;
  new.last_gmail_delivery_at := old.last_gmail_delivery_at;
  new.last_morning_digest_at := old.last_morning_digest_at;
  new.last_evening_digest_at := old.last_evening_digest_at;
  new.last_weekly_digest_at := old.last_weekly_digest_at;

  return new;
end;
$$;

drop trigger if exists profiles_protect_privileged_columns on public.profiles;

create trigger profiles_protect_privileged_columns
before update on public.profiles
for each row
execute function public.protect_profile_privileged_columns();

comment on function public.protect_profile_privileged_columns is
  'Blocks authenticated clients from mutating admin, Telegram, and Gmail delivery fields';
