# Lovable Implementation Plan — Event Hosting Platform

This plan is written specifically for **lovable.dev** (React + Vite + TypeScript + Tailwind + shadcn/ui + Supabase). It is sequenced so each phase leaves the app in a working, testable state. Every requirement from the spec is mapped to a concrete piece of work; nothing extra is added.

---

## 0. Conventions used in this plan

- **Phase prompts** (in fenced blocks labeled `PROMPT FOR LOVABLE`) are meant to be pasted into Lovable's chat one at a time, in order.
- **SQL** blocks should be applied via Lovable's Supabase integration (Lovable can run them; or paste into the SQL editor).
- All times are stored as `timestamptz` (UTC) plus a separate `time_zone` text column (IANA, e.g. `Europe/Warsaw`) so the event's *intended* zone is preserved for display.
- "Public URL" means the deployed Lovable preview/published URL.

---

## 1. Tech & libraries

Lovable's defaults handle most of this. Explicitly add:

- `qrcode.react` — render ticket QR codes
- `date-fns` and `date-fns-tz` — formatting + timezone display
- `react-helmet-async` — per-page `<title>`/OG meta
- `papaparse` *(optional, only if Lovable doesn't write a clean CSV builder itself)*

No payment libs. No camera/scanner libs (manual code entry only).

---

## 2. Data model (single migration)

Run this **before** building UI. It encodes capacity, waitlist FIFO, ticket codes, role-based access, gallery moderation, and reporting — everything downstream depends on it.

```sql
-- =========================================================
-- PROFILES (mirror of auth.users for app-level joins)
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
  time_zone text not null,                         -- IANA tz of the event
  venue_address text,                              -- either this...
  online_url text,                                 -- ...or this (or both)
  capacity int not null check (capacity > 0),
  cover_image_url text,
  visibility event_visibility not null default 'public',
  status     event_status     not null default 'draft',
  is_paid    boolean not null default false,       -- toggle exists; always false for now
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
  -- short, human-typeable code for manual check-in (also encoded in QR)
  ticket_code text unique not null
    default upper(substr(encode(gen_random_bytes(6),'hex'),1,8)),
  waitlist_position int,                            -- only set when status='waitlist'
  promoted_at timestamptz,                          -- set when waitlist→going
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
  unique (rsvp_id)            -- enforces "no duplicate check-ins" (undone row stays; new check-in flips undone=false)
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
```

### Atomic RSVP function (handles capacity + waitlist FIFO)

```sql
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

  -- lock the event row to serialize concurrent RSVPs
  select capacity into v_capacity
  from public.events where id = p_event_id and status='published'
  for update;
  if v_capacity is null then raise exception 'event not available'; end if;

  -- if user already has a non-cancelled RSVP, return it
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
```

### Cancel + auto-promotion trigger (FIFO)

```sql
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
  -- only act when a 'going' seat opens, or capacity grows
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

-- Also promote when capacity is increased on an event
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
```

### Helper views (used by dashboard & explore)

```sql
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
```

---

## 3. Row-Level Security (RLS)

Enable RLS on every public table. Policies (essentials only — exhaustive but minimal):

```sql
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

-- helper: is user a host (role='host') for this host_id?
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

-- profiles: a user reads their own; hosts can read attendee profiles via RSVPs (handled in app via joins as service role / edge fn if needed). For simplicity:
create policy profiles_self_rw on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_public_read on public.profiles
  for select using (true);            -- display_name is public-ish; OK

-- hosts: anyone reads, only members can update, anyone signed-in can insert (becomes the host)
create policy hosts_read on public.hosts for select using (true);
create policy hosts_insert on public.hosts for insert
  with check (auth.uid() = created_by);
create policy hosts_update on public.hosts for update
  using (public.is_host(id)) with check (public.is_host(id));

-- after inserting a host, the creator must also be inserted as host_member with role='host'
-- do this in the app in the same transaction OR add a trigger:
create or replace function public.host_creator_membership()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.host_members(host_id,user_id,role) values (new.id, new.created_by, 'host');
  return new;
end; $$;
create trigger trg_host_creator_membership
after insert on public.hosts for each row execute function public.host_creator_membership();

-- host_members
create policy hm_read_self_or_host on public.host_members
  for select using (user_id=auth.uid() or public.is_host(host_id));
create policy hm_insert_via_invite on public.host_members
  for insert with check (false);   -- only via SECURITY DEFINER fn (see redeem_invite)
create policy hm_host_manage on public.host_members
  for all using (public.is_host(host_id)) with check (public.is_host(host_id));

-- host_invites: hosts manage; redeemers read by token via RPC
create policy hi_host_manage on public.host_invites
  for all using (public.is_host(host_id)) with check (public.is_host(host_id));

-- events: published+public readable by anyone; unlisted readable by anyone with link (still readable);
-- drafts only by host members
create policy events_read_published on public.events
  for select using (status='published' or public.is_member(host_id));
create policy events_host_write on public.events
  for all using (public.is_host(host_id)) with check (public.is_host(host_id));

-- rsvps: user sees their own; host members see all for their events; checkers read for check-in
create policy rsvps_self_read on public.rsvps for select using (user_id=auth.uid());
create policy rsvps_event_staff_read on public.rsvps for select
  using (public.is_member((select host_id from public.events where id=event_id)));
create policy rsvps_self_insert on public.rsvps for insert with check (false); -- only via rsvp_to_event RPC
create policy rsvps_self_update on public.rsvps for update
  using (user_id=auth.uid()) with check (user_id=auth.uid());

-- check_ins: only host members of the event's host can read/write
create policy ci_staff on public.check_ins for all
  using (public.is_member((select host_id from public.events e join public.rsvps r on r.event_id=e.id where r.id=rsvp_id)))
  with check (public.is_member((select host_id from public.events e join public.rsvps r on r.event_id=e.id where r.id=rsvp_id)));

-- feedback: attendee writes own; anyone reads (or host-only read — pick one; the spec only requires submission)
create policy fb_self_write on public.feedback
  for insert with check (user_id=auth.uid())
  using (user_id=auth.uid());
create policy fb_read on public.feedback for select using (true);

-- gallery: anyone reads approved; uploader reads their own pending; hosts manage
create policy gallery_public_read on public.gallery_photos
  for select using (status='approved' or user_id=auth.uid()
                    or public.is_member((select host_id from public.events where id=event_id)));
create policy gallery_self_insert on public.gallery_photos
  for insert with check (user_id=auth.uid());
create policy gallery_host_update on public.gallery_photos
  for update using (public.is_host((select host_id from public.events where id=event_id)));

-- reports: anyone signed-in can insert; hosts (any host) read items targeting their events/photos
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
```

### Invite redemption (SECURITY DEFINER)

```sql
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
```

---

## 4. Storage buckets

Create three public buckets in Supabase:

- `host-logos` — public read, owner-only write
- `event-covers` — public read, host-members write
- `gallery` — public read, any authenticated write (display gated by `gallery_photos.status`)

---

## 5. Routing map

```
/                       → Landing (CTA: Explore + Become a Host)
/explore                → Explore (search/filter)
/e/:eventId             → Event page (public)
/h/:slug                → Public Host page
/auth                   → Sign in / sign up (Supabase email+password; magic link OK)
/become-host            → Host self-serve registration
/host                   → Host dashboard (current host context)
/host/events/new        → Event editor (create)
/host/events/:id/edit   → Event editor (edit)
/host/events/:id        → Event admin (RSVPs, CSV, gallery review, reports)
/host/members           → Manage members + create invite link
/host/check-in/:eventId → Check-in page (Host or Checker)
/invite/:token          → Redeem invite
/me/tickets             → My Tickets
/me/events              → My Events (aggregated across hosts where I have a role)
```

---

## 6. Phased build prompts (paste into Lovable in order)

> Before any prompt: confirm Supabase is connected and the SQL from sections 2–3 has been applied. Lovable can run them itself if you ask in Phase 0.

### Phase 0 — Project skeleton + Supabase + schema

```
PROMPT FOR LOVABLE
Set up the project as a React + Vite + TypeScript + Tailwind + shadcn/ui app with
React Router. Connect Supabase. Add libraries: qrcode.react, date-fns,
date-fns-tz, react-helmet-async.

Apply this SQL migration to Supabase exactly as written (do not modify
column names or function signatures): <PASTE SECTION 2 + SECTION 3 SQL>

Create three public Storage buckets: host-logos, event-covers, gallery.

Add a top nav with: logo, Explore, "Become a Host" (signed-out and signed-in
without a host membership), "My Tickets" + "My Events" (signed-in), avatar
menu with Sign out. Do not implement the pages yet — just routes and a
404-friendly shell. Use react-helmet-async to render base OG/Twitter meta tags
in index.html and a default <title>.
```

### Phase 1 — Auth + profiles

```
PROMPT FOR LOVABLE
Build /auth with Supabase email+password sign-up and sign-in (no email
confirmation required for the demo). On sign-in, redirect to a `next` query
param if present, else `/`. Use a useSession() hook + a ProtectedRoute wrapper
for routes that need auth.

Important: when an unauthenticated user clicks RSVP, send them to
/auth?next=/e/:eventId so they return to the event page after sign-in.
```

### Phase 2 — Become a Host + public Host page

```
PROMPT FOR LOVABLE
/become-host: form with name, slug (auto from name, editable, must be unique),
logo (upload to host-logos), short bio (textarea), contact_email. On submit:
insert into hosts. The trg_host_creator_membership trigger will add the user
as a host_member with role='host' automatically. Redirect to /host.

/h/:slug: public page that shows host name, logo, bio, contact_email, and the
host's published+public upcoming events as cards. Set page <title> and OG tags
to host.name + bio.
```

### Phase 3 — Event editor + Host dashboard skeleton

```
PROMPT FOR LOVABLE
/host: list events for the current host (if user has multiple host memberships,
include a Host switcher in the header). Two tabs: Upcoming (ends_at >= now())
and Past (ends_at < now()). For each event show title, date, visibility badge,
status badge, and stats from the event_stats view: Going / Waitlist / Checked-in.

/host/events/new and /host/events/:id/edit: event editor with fields exactly:
- title (required)
- description (textarea, markdown not required)
- starts_at, ends_at (date+time pickers; ends_at > starts_at)
- time_zone (IANA picker, default to browser tz)
- venue_address (text) OR online_url (url) — at least one required
- capacity (int, > 0)
- cover_image (upload to event-covers)
- visibility: Public | Unlisted (radio)
- Free/Paid toggle: a Switch with two options labeled "Free" and "Paid".
  The "Paid" option is DISABLED. Wrap it in a shadcn Tooltip with text
  "Coming soon". is_paid in DB stays false.
- status: starts as draft.

Editor actions: Save Draft, Publish (sets status='published'), Unpublish
(sets status='draft'), Duplicate (insert a copy with status='draft' and
title + " (copy)").

Past events in the dashboard show an "Ended" badge.
```

### Phase 4 — Public event page + Explore

```
PROMPT FOR LOVABLE
/e/:eventId: public event page showing cover image, title, host (linked to /h/:slug),
formatted start/end in the event's time_zone (use date-fns-tz; also show user's
local time as a secondary line), location (address or online link — show online
link only to confirmed attendees), description, capacity, and live counts:
"X going · Y on waitlist" from event_stats.

If ends_at < now(): show a prominent "Ended" badge and DO NOT render the RSVP
button. Show the feedback form (Phase 8) and gallery (Phase 9) instead.

If user is unauthenticated and the event is upcoming: RSVP button routes to
/auth?next=/e/:eventId.

Set per-page <title> and og:title/og:description/og:image meta tags via
react-helmet-async using event title, description, cover_image_url.

/explore: grid of event cards with:
- Text search (title + description, ilike)
- Date range filter (defaults to "Upcoming": starts_at >= today)
- Location filter (text match against venue_address; events with online_url
  only are tagged "Online")
- "Include Past" toggle (when on, removes the upcoming default and shows past
  events too, with the Ended badge)
Only events with status='published' AND visibility='public' appear here.
Unlisted events are reachable only by direct link.
```

### Phase 5 — RSVP + ticket + waitlist

```
PROMPT FOR LOVABLE
On /e/:eventId for a signed-in user on an upcoming event:
- "RSVP" button calls supabase.rpc('rsvp_to_event', { p_event_id }).
- Show resulting state inline:
  - status='going'  → "You're going" + a Ticket card.
  - status='waitlist' → "You're #N on the waitlist".
- Ticket card shows: event title, date/time, location, ticket_code (large,
  monospaced), QR code (qrcode.react) encoding the ticket_code, an
  "Add to Calendar" button, and a "Cancel RSVP" button.
- "Add to Calendar" generates an .ics file client-side and triggers download
  (VEVENT with UID=ticket_code, DTSTART/DTEND in UTC, SUMMARY=title,
  DESCRIPTION=description, LOCATION=venue_address or online_url).
- "Cancel RSVP" calls supabase.rpc('cancel_rsvp', { p_event_id }) and updates
  the UI. The promote_waitlist trigger handles auto-promotion server-side.

/me/tickets: list of the current user's RSVPs where status in ('going','waitlist')
and the event is upcoming (ends_at >= now()). Each row links to the event and
shows ticket_code + small QR. If status='waitlist' show position.

Subscribe via Supabase realtime to public:rsvps where user_id=eq.<me> on the
event page and on /me/tickets so a waitlist→going promotion appears live and
shows a toast: "You've been promoted from the waitlist." (This satisfies
"Promotion is visible in-app to the affected attendee".)
```

### Phase 6 — Members + invite links

```
PROMPT FOR LOVABLE
/host/members: shows current host_members (display_name, email, role).
Buttons: "Create Host invite link" and "Create Checker invite link". Each
inserts a row into host_invites with the chosen role and shows a copyable URL
of the form `<APP_URL>/invite/<token>`. Allow revoking (set used_at=now()).

/invite/:token: if signed out → /auth?next=/invite/:token. If signed in → call
supabase.rpc('redeem_invite', { p_token }). On success show "You joined
<host name> as <role>" and link to /host (if host) or /me/events (if checker).
On error show the failure reason.
```

### Phase 7 — Check-in page

```
PROMPT FOR LOVABLE
/host/check-in/:eventId — accessible to anyone in host_members for that
event's host (role='host' OR 'checker').

UI:
- Live counters at top: Going / Checked-in / Remaining (= going - checked-in),
  using event_stats + a realtime subscription to check_ins for this event.
- A single text input + "Check in" button: user types/pastes the ticket_code.
  On submit:
    1) lookup rsvp by ticket_code WHERE event_id = :eventId and status='going'
    2) if not found → "Invalid code"
    3) if a check_ins row exists for this rsvp with undone=false → "Already
       checked in at <time>" (do NOT create a duplicate)
    4) else upsert check_ins(rsvp_id, checker_id=auth.uid(), undone=false)
       (the unique(rsvp_id) constraint plus an upsert with undone=false handles
       re-check-in after an undo).
- A "Recent check-ins" list (last 20) with attendee name + time, each row has
  an "Undo" button only on the most recent row. Undo sets undone=true.
- The "Undo last scan" affordance is also available as a top-level button that
  acts on the most recent check_ins row (by checked_in_at desc, undone=false).

QR codes are generated for each ticket (Phase 5). Camera scanning is NOT
required — manual code entry is the supported flow.
```

### Phase 8 — Host dashboard event detail + CSV export + feedback

```
PROMPT FOR LOVABLE
/host/events/:id (admin view, host role only):
- Tabs: Overview, Attendees, Gallery, Reports, Feedback.
- Overview: stats from event_stats + Edit / Publish / Unpublish / Duplicate buttons.
- Attendees: table of RSVPs (display_name, email, status, ticket_code, created_at,
  checked_in_at via join). Filter by status. "Export CSV" button.

CSV export (client-side):
- Columns exactly: name, email, rsvp_status, check_in_time
- UTF-8 with BOM (\uFEFF), comma-separated, double-quote escaping, CRLF line
  endings. Filename: `<event-slug>-rsvps.csv`. Verify the file opens cleanly in
  Excel and Google Sheets.
- A second export "attendance.csv" with the same columns but only rows that
  have a non-undone check_ins record.

Feedback: on /e/:eventId, when ends_at < now() and the user has a 'going'
RSVP, show a feedback form (1–5 star rating + optional comment) that inserts
into feedback (unique constraint blocks duplicates). The Feedback tab in the
admin view lists submitted ratings with average.
```

### Phase 9 — Gallery + reporting + moderation

```
PROMPT FOR LOVABLE
On /e/:eventId after the event has ended:
- Gallery section listing approved photos.
- Signed-in users see an "Upload photo" button → upload to gallery bucket,
  insert gallery_photos row with status='pending'.
- Each photo has a "Report" button (any user) → opens a small dialog with a
  reason field → inserts into reports(target_type='photo', target_id=<photo>).
- On the event page itself (anywhere), a "Report event" link inserts into
  reports(target_type='event', target_id=<event>).

Host admin → Gallery tab: list pending uploads with Approve / Reject (set
status='approved' or 'hidden').

Host admin → Reports tab: list reports for this event and its photos (uses
the reports RLS policies). Actions: Hide (set status='hidden' AND set the
target's status to 'hidden' for photos, or events.status='draft' for events)
or Dismiss (status='dismissed').
```

### Phase 10 — My Events (cross-host aggregation)

```
PROMPT FOR LOVABLE
/me/events: list of every event where the signed-in user is a member of the
host. Columns: title, host name (linked), date, my role on that host
('host'|'checker'), status, stats. Filters: by host (multiselect), date range,
text search.

Quick actions (role-appropriate):
- role='host'   → Edit, Publish/Unpublish, Open admin, Open check-in
- role='checker'→ Open check-in only
```

### Phase 11 — Polish & finishing touches

```
PROMPT FOR LOVABLE
- Empty states for every list (Explore, dashboards, gallery, tickets).
- Loading skeletons for event/host pages.
- 404 page that links back to /explore.
- All pages set <title> and og:title/og:description/og:image via
  react-helmet-async (best-effort for SPA crawlers; document this in report.md).
- Confirm the Free/Paid Switch keeps Paid disabled with a Tooltip "Coming soon".
- Confirm past events show "Ended" badge on the event page and in Explore,
  and that the RSVP button is hidden on past events.
- Confirm waitlist promotion toast appears via realtime.
- Confirm CSV download works in Excel and Sheets (BOM + CRLF).
```

---

## 7. Seed data (run after build, before submission)

Required by the spec: at least one Host, one upcoming event, one past event.

```sql
-- Run as service role in the SQL editor. Replace USER_UUID with a real auth.users id
-- (sign up once via the UI, then copy your id from auth.users).

insert into public.hosts (slug, name, bio, contact_email, created_by)
values ('demo-collective', 'Demo Collective',
        'A community space hosting free meetups for makers.',
        'hello@demo.example', 'USER_UUID')
returning id; -- copy this as HOST_ID

-- one upcoming event (in 14 days, 2 hours long)
insert into public.events (host_id, title, description, starts_at, ends_at,
  time_zone, venue_address, capacity, visibility, status)
values ('HOST_ID', 'Intro to Indie Hacking',
        'A relaxed evening of show-and-tell from local builders.',
        now() + interval '14 days',
        now() + interval '14 days 2 hours',
        'Europe/Warsaw', 'Demo Hall, 1 Example St', 25, 'public', 'published');

-- one past event (1 week ago)
insert into public.events (host_id, title, description, starts_at, ends_at,
  time_zone, venue_address, capacity, visibility, status)
values ('HOST_ID', 'Spring Community Mixer',
        'Casual networking with snacks and lightning talks.',
        now() - interval '8 days',
        now() - interval '8 days' + interval '3 hours',
        'Europe/Warsaw', 'Demo Hall, 1 Example St', 40, 'public', 'published');
```

Then via the UI: RSVP a second test user to the upcoming event, check them in once on /host/check-in/:eventId, and download a CSV — that's your example export artifact.

---

## 8. Submission artifacts checklist

- [ ] Public deployed URL (Lovable's "Publish" → custom subdomain).
- [ ] Seeded: 1 host, 1 upcoming event, 1 past event (Section 7).
- [ ] `example-rsvps.csv` committed to the repo (downloaded from the dashboard).
- [ ] `report.md` covering:
  - Stack (Lovable + React/Vite/TS/Tailwind/shadcn/Supabase).
  - Schema decisions (single rsvps table with status enum; ticket_code as the QR payload; SECURITY DEFINER RPCs `rsvp_to_event`, `cancel_rsvp`, `redeem_invite` for atomicity and to enforce capacity/waitlist correctly under concurrency).
  - Trigger-based waitlist promotion + realtime for in-app visibility.
  - What worked (RLS + helper fns is_host/is_member; shadcn for fast UI; Supabase Storage for images).
  - What didn't / tradeoffs (true per-page OG meta in an SPA is best-effort; manual code entry only — camera scanning intentionally out of scope per spec; Paid toggle disabled because payments are not in scope).
  - Notable decisions (FIFO promotion done inside DB triggers rather than client; one events table covers both in-person and online via nullable address/url).
- [ ] `README.md` as a usage guide walking through Publish → RSVP → Ticket → Check-in:
  1. Sign up → Become a Host → fill the host form.
  2. Create an event → set capacity small (e.g. 2) → Publish.
  3. Open in incognito as a second user → RSVP → see the ticket + QR + Add to Calendar.
  4. RSVP a third user to trigger the waitlist; cancel the first user's RSVP and watch the third get promoted.
  5. Open /host/check-in/:eventId, paste the ticket_code, see counters update, undo, re-check-in.
  6. After event end time: leave feedback, upload a gallery photo, approve it from the admin Gallery tab, report something to see the review queue.
  7. Export the CSV from the Attendees tab.

---

## 9. Requirement → implementation traceability

Use this table during review to confirm nothing was dropped.

| Requirement | Where it lives |
|---|---|
| Self-serve Host registration | Phase 2, `/become-host` |
| Host profile (name, logo, bio, contact_email) + public Host page | Phase 2, `/h/:slug` |
| Event creation (title, description, start/end+tz, address or online url, capacity, cover) | Phase 3 editor |
| Public/Unlisted + Draft/Published + Publish/Unpublish/Duplicate | Phase 3 editor actions |
| Free/Paid toggle, Paid disabled, "Coming soon" tooltip | Phase 3 editor |
| Explore: text search, date range (Upcoming default), location, Include Past | Phase 4 `/explore` |
| Past events show "Ended", RSVP hidden | Phase 4 + Phase 11 |
| Social preview metadata | Phases 2, 4, 11 (react-helmet-async) |
| RSVP requires sign-in, returns to event page | Phase 1 + Phase 5 |
| Capacity enforced; over-capacity → waitlist | `rsvp_to_event` RPC |
| Confirmed → ticket with unique QR + Add to Calendar | Phase 5 |
| Cancel RSVP; My Tickets page | Phase 5 |
| Waitlist FIFO + auto-promotion | `promote_waitlist` trigger |
| Promotion visible in-app | Phase 5 realtime toast |
| Two roles: Host, Checker | `host_role` enum, RLS, Phase 6 |
| Invite via copyable link | Phase 6, `host_invites`, `redeem_invite` |
| Host dashboard with Upcoming/Past + Going/Waitlist/Checked-in | Phase 3 + `event_stats` view |
| CSV export (name, email, rsvp_status, check_in_time) opens in Excel + Sheets | Phase 8 |
| My Events aggregated across hosts with filters and role-aware actions | Phase 10 |
| Check-in page: manual entry, live counters, no duplicates, undo | Phase 7 |
| QR generated per ticket; camera not required | Phase 5 + Phase 7 |
| Post-event feedback (1–5 + comment) after event ends | Phase 8 |
| Gallery uploads need Host approval | Phase 9 |
| Report flow + review queue + hide | Phase 9 |
| Public deploy + seed data + CSV + report.md + README | Section 7 + Section 8 |
