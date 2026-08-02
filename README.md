# MaidItEasy

Home-services booking app for **Dumaguete City** — verified partners, fixed peso pricing, easy
booking. Built with Expo (React Native) + TypeScript, from an HTML/CSS design prototype.

## Quick start

```bash
npm install
cp .env.example .env   # fill in your Supabase project URL + anon key (see "Backend" below)
npx expo start
```

Then press `i` for the iOS simulator, `a` for Android, or `w` to open in a web browser. On a
physical device, install **Expo Go** and scan the QR code.

If any dependency versions complain, run `npx expo install --fix` to align them to Expo SDK 57.

## Backend: Supabase

Every table + the photo Storage bucket lives in `supabase/migrations/*.sql`. Against a fresh
Supabase project:
1. Open the SQL Editor in the Supabase dashboard and run each migration file, in filename order.
2. Authentication → Sign In / Providers → enable **"Allow anonymous sign-ins"** (phone OTP is
   currently a stub — any 6-digit code works, but it needs this to create a real session so the
   rest of the app has something to gate behind; swap in a real SMS provider like Twilio via
   Supabase Auth's phone provider when ready).
3. Settings → API → copy the Project URL and anon/publishable key into `.env`.

## What's built

The **customer app** end to end: welcome → phone/OTP sign-in → service catalog → service detail →
booking (units or home size, date, time) → location (barangay, landmark, contact) → payment
(GCash / cash) → confirmation → live tracking — all backed by real Supabase data (bookings,
payments, session).

The **partner app** (`app/(partner)/`): dashboard, job detail with Accept/Decline, active-job
progress timeline with before/after photo upload to Storage, and completed/declined screens. Jobs
are dispatched from the admin console — partners only ever see bookings already assigned to them.

The **admin console** (`admin/`, a separate Next.js app): daily summary, a booking board to assign
verified partners to jobs, GCash payment verification, a worker roster with an add-worker flow, and
a service catalog editor. Run it with:

```bash
cd admin
npm install
cp .env.example .env.local   # same Supabase URL + anon key as the root .env
npm run dev                  # http://localhost:3000
```

### Bootstrapping the first admin

The admin console requires a real login — there's no self-service signup, so the first admin has
to be created directly in the Supabase dashboard:
1. **Authentication → Users → Add user** — create a user with an email + password (check "Auto
   Confirm User" so it doesn't need email confirmation).
2. **SQL Editor** — run:
   ```sql
   insert into public.admins (auth_user_id)
   values ('<the new user's UUID from step 1>');
   ```
3. Log in at `http://localhost:3000/login` with that email + password.

Once you have one admin account, there's no in-app way to add more yet — repeat the two steps
above for each additional admin.

### Resetting a forgotten password

- **Partner** — an admin can reset it from the Worker roster ("Reset password" on that worker's
  row). This works with no email/SMS setup: it generates a new one-time password server-side and
  shows it once for the admin to hand off, same as creating the account in the first place.
- **Admin** — "Forgot password?" on the admin login screen uses Supabase Auth's own email flow
  (`resetPasswordForEmail`). **This requires a custom SMTP provider configured** in the Supabase
  dashboard (Authentication → Emails / SMTP Settings) — Supabase's built-in email sending is rate
  limited and not reliable enough to depend on for this. Without SMTP configured, the request
  still "succeeds" silently (no email ever arrives) rather than failing loudly, so confirm delivery
  by actually checking an inbox once SMTP is set up, not just by the UI's success message.

## Project structure

Design tokens live in `src/theme.ts`; catalog/content in `src/data.ts`; the original HTML/CSS
prototypes are in `design-handoff/` for reference.
