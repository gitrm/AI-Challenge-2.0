-- =========================================================
-- PROFILES
-- =========================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  email text,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)));
  return new;
end; $$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- =========================================================
-- HOSTS + MEMBERSHIP
-- =========================================================
create table public.hosts (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  logo_url text,
  bio text,
  contact_email text not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create type host_role as enum ('host','checker');

create table public.host_members (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.hosts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role host_role not null,
  created_at timestamptz not null default now(),
  unique (host_id, user_id)
);

create table public.host_invites (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.hosts(id) on delete cascade,
  role host_role not null,
  token text unique not null default encode(gen_random_bytes(18), 'hex'),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days'),
  used_at timestamptz,
  used_by uuid references auth.users(id)
);

-- =========================================================
-- EVENTS
-- =========================================================
create type event_visibility as enum ('public','unlisted');
create type event_status     as enum ('draft','published');

create table public.events (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.hosts(id) on delete cascade,
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at   timestamptz not null,
  time_zone text not null,
  venue_address text,
  online_url text,
  capacity int not null check (capacity > 0),
  cover_image_url text,
  visibility event_visibility not null default 'public',
  status     event_status     not null default 'draft',
  is_paid    boolean not null default false,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index on public.events (status, visibility, starts_at);
create index on public.events (host_id);

-- =========================================================
-- RSVPS / TICKETS
-- =========================================================
create type rsvp_status as enum ('going','waitlist','cancelled');

create table public.rsvps (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id  uuid not null references auth.users(id)   on delete cascade,
  status rsvp_status not null,
  ticket_code text unique not null
    default upper(substr(encode(gen_random_bytes(6),'hex'),1,8)),
  waitlist_position int,
  promoted_at timestamptz,
  created_at timestamptz not null default now(),
  cancelled_at timestamptz,
  unique (event_id, user_id)
);

create index on public.rsvps (event_id, status, waitlist_position);
create index on public.rsvps (user_id, status);

-- =========================================================
-- CHECK-INS
-- =========================================================
create table public.check_ins (
  id uuid primary key default gen_random_uuid(),
  rsvp_id uuid not null references public.rsvps(id) on delete cascade,
  checked_in_at timestamptz not null default now(),
  checker_id uuid not null references auth.users(id),
  undone boolean not null default false,
  unique (rsvp_id)
);

-- =========================================================
-- FEEDBACK
-- =========================================================
create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id  uuid not null references auth.users(id)   on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);

-- =========================================================
-- GALLERY
-- =========================================================
create type gallery_status as enum ('pending','approved','hidden');

create table public.gallery_photos (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id  uuid not null references auth.users(id)   on delete cascade,
  image_url text not null,
  status gallery_status not null default 'pending',
  created_at timestamptz not null default now()
);

-- =========================================================
-- REPORTS
-- =========================================================
create type report_target as enum ('event','photo');
create type report_status as enum ('open','hidden','dismissed');

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  target_type report_target not null,
  target_id uuid not null,
  reporter_id uuid not null references auth.users(id),
  reason text,
  status report_status not null default 'open',
  created_at timestamptz not null default now()
);

-- =========================================================
-- RPCs
-- =========================================================
create or replace function public.rsvp_to_event(p_event_id uuid)
returns public.rsvps
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_capacity int;
  v_going int;
  v_pos int;
  v_existing public.rsvps;
  v_new public.rsvps;
begin
  if v_user is null then raise exception 'auth required'; end if;

  select capacity into v_capacity
  from public.events where id = p_event_id and status='published'
  for update;
  if v_capacity is null then raise exception 'event not available'; end if;

  select * into v_existing from public.rsvps
   where event_id = p_event_id and user_id = v_user
     and status in ('going','waitlist');
  if found then return v_existing; end if;

  select count(*) into v_going from public.rsvps
   where event_id = p_event_id and status = 'going';

  if v_going < v_capacity then
    insert into public.rsvps(event_id,user_id,status)
    values (p_event_id, v_user, 'going')
    on conflict (event_id,user_id) do update
      set status='going', cancelled_at=null
    returning * into v_new;
  else
    select coalesce(max(waitlist_position),0)+1 into v_pos
      from public.rsvps where event_id = p_event_id and status='waitlist';
    insert into public.rsvps(event_id,user_id,status,waitlist_position)
    values (p_event_id, v_user, 'waitlist', v_pos)
    on conflict (event_id,user_id) do update
      set status='waitlist', waitlist_position=v_pos, cancelled_at=null
    returning * into v_new;
  end if;

  return v_new;
end; $$;

create or replace function public.cancel_rsvp(p_event_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.rsvps
     set status='cancelled', cancelled_at=now(), waitlist_position=null
   where event_id=p_event_id and user_id=auth.uid()
     and status in ('going','waitlist');
end; $$;

create or replace function public.promote_waitlist()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_capacity int;
  v_going int;
  v_next public.rsvps;
begin
  if (TG_OP='UPDATE' and old.status='going' and new.status<>'going')
     or TG_OP='DELETE' then
    select capacity into v_capacity from public.events
     where id = coalesce(new.event_id, old.event_id);
    select count(*) into v_going from public.rsvps
     where event_id = coalesce(new.event_id, old.event_id) and status='going';
    while v_going < v_capacity loop
      select * into v_next from public.rsvps
       where event_id = coalesce(new.event_id, old.event_id) and status='waitlist'
       order by waitlist_position asc limit 1;
      exit when not found;
      update public.rsvps
         set status='going', promoted_at=now(), waitlist_position=null
       where id = v_next.id;
      v_going := v_going + 1;
    end loop;
  end if;
  return null;
end; $$;

create trigger trg_promote_waitlist
after update or delete on public.rsvps
for each row execute function public.promote_waitlist();

create or replace function public.events_capacity_changed()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_going int; v_next public.rsvps;
begin
  if new.capacity > old.capacity then
    select count(*) into v_going from public.rsvps where event_id=new.id and status='going';
    while v_going < new.capacity loop
      select * into v_next from public.rsvps
       where event_id=new.id and status='waitlist'
       order by waitlist_position asc limit 1;
      exit when not found;
      update public.rsvps set status='going', promoted_at=now(), waitlist_position=null where id=v_next.id;
      v_going := v_going+1;
    end loop;
  end if;
  return null;
end; $$;

create trigger trg_events_capacity_changed
after update of capacity on public.events
for each row execute function public.events_capacity_changed();

-- =========================================================
-- VIEW
-- =========================================================
create or replace view public.event_stats as
select
  e.id as event_id,
  count(*) filter (where r.status='going')                              as going_count,
  count(*) filter (where r.status='waitlist')                           as waitlist_count,
  count(*) filter (where r.status='going' and ci.id is not null
                   and ci.undone = false)                               as checked_in_count
from public.events e
left join public.rsvps r on r.event_id=e.id
left join public.check_ins ci on ci.rsvp_id=r.id
group by e.id;

-- =========================================================
-- RLS
-- =========================================================
alter table public.profiles        enable row level security;
alter table public.hosts           enable row level security;
alter table public.host_members    enable row level security;
alter table public.host_invites    enable row level security;
alter table public.events          enable row level security;
alter table public.rsvps           enable row level security;
alter table public.check_ins       enable row level security;
alter table public.feedback        enable row level security;
alter table public.gallery_photos  enable row level security;
alter table public.reports         enable row level security;

create or replace function public.is_host(p_host uuid)
returns boolean language sql stable as $$
  select exists (
    select 1 from public.host_members
    where host_id=p_host and user_id=auth.uid() and role='host'
  );
$$;

create or replace function public.is_member(p_host uuid)
returns boolean language sql stable as $$
  select exists (
    select 1 from public.host_members
    where host_id=p_host and user_id=auth.uid()
  );
$$;

create policy profiles_self_rw on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_public_read on public.profiles
  for select using (true);

create policy hosts_read on public.hosts for select using (true);
create policy hosts_insert on public.hosts for insert
  with check (auth.uid() = created_by);
create policy hosts_update on public.hosts for update
  using (public.is_host(id)) with check (public.is_host(id));

create or replace function public.host_creator_membership()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.host_members(host_id,user_id,role) values (new.id, new.created_by, 'host');
  return new;
end; $$;
create trigger trg_host_creator_membership
after insert on public.hosts for each row execute function public.host_creator_membership();

create policy hm_read_self_or_host on public.host_members
  for select using (user_id=auth.uid() or public.is_host(host_id));
create policy hm_insert_via_invite on public.host_members
  for insert with check (false);
create policy hm_host_manage on public.host_members
  for all using (public.is_host(host_id)) with check (public.is_host(host_id));

create policy hi_host_manage on public.host_invites
  for all using (public.is_host(host_id)) with check (public.is_host(host_id));

create policy events_read_published on public.events
  for select using (status='published' or public.is_member(host_id));
create policy events_host_write on public.events
  for all using (public.is_host(host_id)) with check (public.is_host(host_id));

create policy rsvps_self_read on public.rsvps for select using (user_id=auth.uid());
create policy rsvps_event_staff_read on public.rsvps for select
  using (public.is_member((select host_id from public.events where id=event_id)));
create policy rsvps_self_insert on public.rsvps for insert with check (false);
create policy rsvps_self_update on public.rsvps for update
  using (user_id=auth.uid()) with check (user_id=auth.uid());

create policy ci_staff on public.check_ins for all
  using (public.is_member((select host_id from public.events e join public.rsvps r on r.event_id=e.id where r.id=rsvp_id)))
  with check (public.is_member((select host_id from public.events e join public.rsvps r on r.event_id=e.id where r.id=rsvp_id)));

create policy fb_self_write on public.feedback
  for insert with check (user_id=auth.uid());
create policy fb_self_read on public.feedback
  for select using (true);

create policy gallery_public_read on public.gallery_photos
  for select using (status='approved' or user_id=auth.uid()
                    or public.is_member((select host_id from public.events where id=event_id)));
create policy gallery_self_insert on public.gallery_photos
  for insert with check (user_id=auth.uid());
create policy gallery_host_update on public.gallery_photos
  for update using (public.is_host((select host_id from public.events where id=event_id)));

create policy reports_insert on public.reports
  for insert with check (auth.uid() is not null);
create policy reports_host_read on public.reports for select
  using (
    (target_type='event' and public.is_member((select host_id from public.events where id=target_id)))
    or (target_type='photo' and public.is_member(
          (select e.host_id from public.events e join public.gallery_photos p on p.event_id=e.id where p.id=target_id)
        ))
  );
create policy reports_host_update on public.reports for update
  using (
    (target_type='event' and public.is_host((select host_id from public.events where id=target_id)))
    or (target_type='photo' and public.is_host(
          (select e.host_id from public.events e join public.gallery_photos p on p.event_id=e.id where p.id=target_id)
        ))
  );

-- =========================================================
-- Invite redemption
-- =========================================================
create or replace function public.redeem_invite(p_token text)
returns public.host_members
language plpgsql security definer set search_path=public as $$
declare v_invite public.host_invites; v_member public.host_members;
begin
  if auth.uid() is null then raise exception 'auth required'; end if;
  select * into v_invite from public.host_invites
    where token=p_token and used_at is null and expires_at > now() for update;
  if not found then raise exception 'invalid or expired invite'; end if;

  insert into public.host_members(host_id,user_id,role)
  values (v_invite.host_id, auth.uid(), v_invite.role)
  on conflict (host_id,user_id) do update set role=excluded.role
  returning * into v_member;

  update public.host_invites set used_at=now(), used_by=auth.uid() where id=v_invite.id;
  return v_member;
end; $$;

-- =========================================================
-- Storage buckets
-- =========================================================
insert into storage.buckets (id, name, public) values
  ('host-logos', 'host-logos', true),
  ('event-covers', 'event-covers', true),
  ('gallery', 'gallery', true)
on conflict (id) do nothing;

create policy "Public read host-logos" on storage.objects for select using (bucket_id='host-logos');
create policy "Public read event-covers" on storage.objects for select using (bucket_id='event-covers');
create policy "Public read gallery" on storage.objects for select using (bucket_id='gallery');

create policy "Auth upload host-logos" on storage.objects for insert
  with check (bucket_id='host-logos' and auth.uid() is not null);
create policy "Auth upload event-covers" on storage.objects for insert
  with check (bucket_id='event-covers' and auth.uid() is not null);
create policy "Auth upload gallery" on storage.objects for insert
  with check (bucket_id='gallery' and auth.uid() is not null);