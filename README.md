# Sober Hub — Full-Stack Web Application

Sober Hub is a youth-focused, substance-free support and productivity platform. This build contains the frontend, Vercel serverless API, Neon PostgreSQL persistence, role-based authentication, email verification, password recovery and membership checkout.

## Core flows
- Member/Staff signup with role tabs
- Staff signup protected by `STAFF_SIGNUP_CODE`
- Email confirmation before login
- Bcrypt password hashing
- HTTP-only JWT session cookie
- Personalised member dashboard
- Profile, check-in, community, mentor and emergency support
- Staff portal for members and support requests
- Membership selection: R50 / R75 / R100
- Demo checkout or Stripe test Checkout
- Payment history and 30-day membership activation

## Environment
See `.env.example` and `DEPLOYMENT.md`.
