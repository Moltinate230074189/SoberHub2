# Sober Hub — Current Full-Stack Status

## Implemented
- Neon PostgreSQL persistence for users, check-ins, community posts, mentor requests, emergency requests and payments.
- Member/staff registration with staff code protection.
- bcrypt password hashing.
- HttpOnly + Secure + SameSite=Lax session cookie with a 7-day JWT.
- Email verification with a 24-hour single-use token.
- Resend verification with a 60-second UI cooldown plus server-side rate limits.
- Password reset links with one-hour expiry and rate limiting.
- Protected API routes; unverified users cannot obtain or use a valid application session.
- Personalized dashboard greeting using the authenticated user's first name.
- Stripe Checkout support for R50/R75/R100 membership plans, with optional demo payment mode.
- Stripe webhook handler with signature validation in `api/stripe-webhook.js`.
- Server-side checkout session ownership checks.
- Input validation for authentication fields.
- Database-backed rate limiting for registration, login, verification resend, verification and password reset.
- Security headers and a restrictive same-origin Content Security Policy in `vercel.json`.
- Secrets are read from Vercel environment variables, not frontend JavaScript.

## Production configuration still required
1. Set `DEMO_MODE=false`.
2. Set a long random `JWT_SECRET`.
3. Set `DATABASE_URL` to the Neon connection string.
4. Set `APP_URL` to the live Vercel URL.
5. Add `RESEND_API_KEY` in Vercel Production.
6. Verify a sending domain in Resend and set `EMAIL_FROM` to an address on that domain. The `resend.dev` sender is for testing and has production limitations.
7. For real card payments, set `DEMO_PAYMENT_MODE=false`, add `STRIPE_SECRET_KEY` and configure the Stripe webhook URL and `STRIPE_WEBHOOK_SECRET`.

## Presentation mode
For a classroom demonstration, `DEMO_PAYMENT_MODE=true` is acceptable: it records a payment in Neon and activates a 30-day membership without charging a card. For a real deployment, use Stripe test/live configuration instead.
