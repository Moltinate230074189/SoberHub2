# Sober Hub — Vercel + Neon + Email Verification + Stripe Checkout

## Required Vercel variables
- `DATABASE_URL` — Neon PostgreSQL connection string
- `DEMO_MODE=false`
- `JWT_SECRET` — long random secret
- `STAFF_SIGNUP_CODE=SOBER-STAFF-2026`
- `APP_URL=https://YOUR-PROJECT.vercel.app`
- `RESEND_API_KEY` — Resend API key for verification/reset emails
- `EMAIL_FROM` — sender using a verified domain in Resend

## Email verification
New accounts are created as unverified. The API sends a 24-hour verification link. Users cannot log in until the link is used. Password reset also uses a one-hour email link.

For real email delivery, configure Resend and use a verified sending domain. Never commit the API key.

## Stripe test checkout
Set:
- `DEMO_PAYMENT_MODE=false`
- `STRIPE_SECRET_KEY=sk_test_...`
- `APP_URL=https://YOUR-PROJECT.vercel.app`

The membership page creates a Stripe Checkout Session in ZAR for R50, R75 or R100 and redirects the member to Stripe's secure hosted checkout. The success page verifies the Checkout Session server-side and activates the 30-day membership. The optional webhook remains available for asynchronous confirmation.

For a classroom demo without Stripe, keep `DEMO_PAYMENT_MODE=true`; this records a demo payment in Neon without charging a card.

## Database
Run `schema.sql` once in Neon SQL Editor. The backend also performs safe `CREATE TABLE IF NOT EXISTS`/column migrations on its first request.

## Health check
Open `/api/health`. A working connection returns `ok: true` and `database: connected`.
