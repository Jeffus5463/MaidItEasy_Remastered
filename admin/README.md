# MaidItEasy — admin console

Operations dashboard for MaidItEasy: daily summary, booking dispatch, GCash payment verification,
worker roster, and service catalog. A separate Next.js app from the Expo customer/partner apps in
the repo root, sharing the same Supabase project.

## Quick start

```bash
npm install
cp .env.example .env.local   # same Supabase URL + anon key as the root .env
npm run dev                  # http://localhost:3000
npx tsc --noEmit             # typecheck
```

Shares the same Supabase project as the root Expo app (same URL/anon key). Requires a real admin
account to log in — see the root [`README.md`](../README.md#bootstrapping-the-first-admin) for how
to bootstrap the first one.
