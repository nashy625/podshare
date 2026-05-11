# PodShare Deployment Guide

This document describes the shortest path from the current repo to a working staging deployment.

## 1. Accounts You Need

- Supabase
- Stripe
- SendGrid
- Vercel for frontend hosting
- Railway or Render for backend hosting

## 2. Backend Environment Variables

Set these for the backend service:

```env
PORT=4000
DATABASE_URL=postgresql://...
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
SENDGRID_API_KEY=SG...
JWT_SECRET=replace-me
ENCRYPTION_KEY=replace-me-32-characters-minimum
APP_URL=https://your-frontend-domain.com
```

Notes:
- `DATABASE_URL` should point at your Supabase Postgres database.
- `APP_URL` must match the frontend origin used in the magic-link flow.
- `ENCRYPTION_KEY` should be long, random, and stable across deploys.

## 3. Frontend Environment Variables

Set these for the frontend:

```env
VITE_API_URL=https://your-backend-domain.com
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=...
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

## 4. Database Setup

Current Prisma schema file:
- [schema.prisma](/Users/nashy/PodShare/apps/backend/prisma/schema.prisma)

Recommended sequence:

1. Put the real `DATABASE_URL` in `apps/backend/.env`
2. Generate Prisma client:
   `npm run prisma:generate`
3. Create the first migration locally:
   `npm run prisma:migrate --workspace backend`
4. For production/staging, use Prisma deploy-style migration commands in your host pipeline

Important:
- this repo currently has schema and generated client, but no checked-in migration history yet
- you should create and review the first migration against a real database before production

## 5. Supabase Setup

Configure:

- Auth enabled for email magic links
- Redirect URL:
  `https://your-frontend-domain.com/login/verify`
- service role key available to backend

Supabase responsibilities in current code:

- magic-link sign in
- access token verification
- user identity source
- optional hosted Postgres

## 6. Stripe Setup

Current backend Stripe entry points:
- SetupIntent creation in [payments.ts](/Users/nashy/PodShare/apps/backend/src/routes/payments.ts)
- webhook handling in [payments-webhook.ts](/Users/nashy/PodShare/apps/backend/src/routes/payments-webhook.ts)
- recurring billing helpers in [billing.ts](/Users/nashy/PodShare/apps/backend/src/lib/billing.ts)

Set up in Stripe:

1. create API keys
2. set webhook endpoint to:
   `https://your-backend-domain.com/api/webhooks/stripe`
3. subscribe webhook events at minimum:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`

Current implementation status:
- SetupIntent flow is coded
- off-session charge attempt flow is coded
- webhook updates are coded
- live Stripe configuration/testing still must be done with your real account

## 7. Backend Hosting

Recommended backend deploy target:
- Railway or Render

Backend app entry:
- [index.ts](/Users/nashy/PodShare/apps/backend/src/index.ts)

Build command:
```bash
npm run build --workspace backend
```

Start command:
```bash
node apps/backend/dist/index.js
```

## 8. Frontend Hosting

Recommended frontend deploy target:
- Vercel

Frontend app root:
- [apps/frontend](/Users/nashy/PodShare/apps/frontend)

Build command:
```bash
npm run build --workspace frontend
```

Output directory:
```text
apps/frontend/dist
```

## 9. Suggested Staging Flow

1. configure Supabase project
2. configure Stripe test account and webhook
3. set backend env vars
4. set frontend env vars
5. run Prisma migration against staging DB
6. deploy backend
7. deploy frontend
8. verify auth redirect
9. verify Stripe SetupIntent flow
10. verify pod billing and webhook state updates

## 10. Production Risks Still To Review

- service-credential storage policy
- payment compliance obligations
- refund/dispute handling
- terms-of-service conflicts for shared subscription platforms
- background job scheduling for automated billing
- rate limiting and abuse controls
