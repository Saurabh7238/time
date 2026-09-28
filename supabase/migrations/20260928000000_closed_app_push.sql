create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

create table if not exists public.focusguard_reminders (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  title text not null,
  fire_at timestamptz not null,
  done boolean not null default false,
  delivered_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create index if not exists focusguard_reminders_due_idx
  on public.focusguard_reminders (fire_at)
  where not done and delivered_at is null;

create table if not exists public.focusguard_push_subscriptions (
  endpoint text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  p256dh text not null,
  auth text not null,
  updated_at timestamptz not null default now()
);

create index if not exists focusguard_push_subscriptions_user_idx
  on public.focusguard_push_subscriptions (user_id);

alter table public.focusguard_reminders enable row level security;
alter table public.focusguard_push_subscriptions enable row level security;

create policy "users manage their own reminders"
  on public.focusguard_reminders
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users manage their own push subscriptions"
  on public.focusguard_push_subscriptions
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.update_focusguard_reminder()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.fire_at is distinct from old.fire_at
    or (old.done and not new.done) then
    new.delivered_at := null;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger focusguard_reminder_updated
  before update on public.focusguard_reminders
  for each row execute function public.update_focusguard_reminder();

create or replace function public.claim_due_focusguard_reminders(batch_size integer default 100)
returns table (user_id uuid, task_id text, title text)
language sql
security definer
set search_path = public
as $$
  with due as (
    select r.user_id, r.id
    from public.focusguard_reminders as r
    where not r.done
      and r.delivered_at is null
      and r.fire_at <= now()
    order by r.fire_at
    limit least(greatest(batch_size, 1), 100)
    for update skip locked
  )
  update public.focusguard_reminders as r
  set delivered_at = now()
  from due
  where r.user_id = due.user_id and r.id = due.id
  returning r.user_id, r.id, r.title;
$$;

revoke all on function public.claim_due_focusguard_reminders(integer) from public, anon, authenticated;
grant execute on function public.claim_due_focusguard_reminders(integer) to service_role;

select cron.schedule(
  'focusguard-send-due-reminders',
  '* * * * *',
  $job$
    select net.http_post(
      url := config.project_url || '/functions/v1/send-due-alarms',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || config.service_role_key,
        'x-cron-secret', config.cron_secret
      ),
      body := '{}'::jsonb
    )
    from (
      select
        (select decrypted_secret from vault.decrypted_secrets where name = 'focusguard_project_url') as project_url,
        (select decrypted_secret from vault.decrypted_secrets where name = 'focusguard_service_role_key') as service_role_key,
        (select decrypted_secret from vault.decrypted_secrets where name = 'focusguard_cron_secret') as cron_secret
    ) as config
    where config.project_url is not null
      and config.service_role_key is not null
      and config.cron_secret is not null;
  $job$
);
