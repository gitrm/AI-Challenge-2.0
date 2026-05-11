## Phase 0 — Foundation

### Stack note (important)
Your plan calls for "React + Vite + React Router". This Lovable template ships with **TanStack Start** (file-based routing in `src/routes/`) on Vite + React + TypeScript + Tailwind v4 + shadcn/ui. React Router DOM isn't supported here. I'll mirror the same routes and behavior using TanStack file routes — no functional difference for your plan. If you'd rather not, stop me before "Implement".

### 1. Backend (Lovable Cloud)
- Enable Lovable Cloud (Supabase under the hood).
- Apply your Phase 0 SQL migration **exactly as written** — all tables, enums, triggers, RPCs (`handle_new_user`, `rsvp_to_event`, `cancel_rsvp`, `promote_waitlist`, `events_capacity_changed`, `host_creator_membership`, `redeem_invite`, `is_host`, `is_member`), the `event_stats` view, and every RLS policy. No column or signature edits.
- Create three **public** Storage buckets: `host-logos`, `event-covers`, `gallery`.

### 2. Dependencies
Add: `qrcode.react`, `date-fns`, `date-fns-tz`, `react-helmet-async`.

### 3. Routing shell (placeholder pages, no feature logic)
Create empty route files under `src/routes/` so links resolve and 404 works:
- `/` (Home — minimal hero, "Explore events" CTA)
- `/explore`
- `/host/new` ("Become a Host")
- `/tickets` ("My Tickets")
- `/events` ("My Events")
- `/login` (placeholder — auth wired in a later phase)
- `/invite/$token` (placeholder for invite redemption)
- `/e/$eventId` (placeholder event page)
- `__root.tsx` keeps the existing 404 + error boundaries.

Each page renders a simple "Coming soon" card so the shell is testable.

### 4. Top navigation
A shared `<TopNav>` rendered in `__root.tsx` above `<Outlet />` with:
- Logo (links to `/`)
- `Explore` link
- `Become a Host` — visible when signed-out, or signed-in without any `host_members` row
- `My Tickets` + `My Events` — signed-in only
- Avatar dropdown (shadcn `DropdownMenu`) with `Sign out`
- Mobile: hamburger `Sheet`

Auth state read via a small `useAuth` hook that subscribes to `supabase.auth.onAuthStateChange` and queries `host_members` count for the "Become a Host" toggle. Until auth flow exists, the hook returns `signedOut` so nav still renders correctly.

### 5. SEO meta
- Wrap app in `HelmetProvider` inside `RootComponent`.
- Add base `<title>` and OG/Twitter meta tags (og:title, og:description, og:type=website, og:image placeholder, twitter:card=summary_large_image) in `index.html` as defaults; per-route `<Helmet>` will override later phases.
- Keep TanStack `head()` in `__root.tsx` minimal so Helmet owns per-page meta.

### 6. Out of scope for Phase 0
No working sign-in/sign-up UI, no event CRUD, no RSVP, no QR, no gallery — those are later phases per your plan.

### Deliverable check
After Phase 0 you should be able to: load `/`, click every nav link without a 404, see the avatar menu placeholder, and confirm in Cloud that all tables/policies/buckets exist.