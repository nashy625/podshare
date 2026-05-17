# Live Setup Checklist

Use this checklist to move PodShare from local scaffold to live staging.

## 1. Fill Backend Env

Edit:
- `apps/backend/.env`

Required real values:
- `DATABASE_URL`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_PUBLISHABLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `SENDGRID_API_KEY`
- `ADMIN_EMAILS`
- `JWT_SECRET`
- `ENCRYPTION_KEY`
- `APP_URL`

## 2. Fill Frontend Env

Edit:
- `apps/frontend/.env`

Required real values:
- `VITE_API_URL`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_STRIPE_PUBLISHABLE_KEY`

## 3. Supabase

- create project
- enable email magic links
- add redirect URL:
  - `http://127.0.0.1:5173/login/verify`
  - `http://localhost:5173/login/verify`
  - your staging domain later
- copy project URL and keys into env files
- get the Session Pooler Postgres connection string for `DATABASE_URL`

## 4. Stripe

- create test-mode API keys
- add keys into env files
- create webhook endpoint:
  - `https://your-backend-domain.com/api/webhooks/stripe`
- subscribe at minimum:
  - `payment_intent.succeeded`
  - `payment_intent.payment_failed`

## 5. Database

Once `DATABASE_URL` is real:
- `npm run prisma:generate`
- `cd apps/backend && npx prisma migrate deploy`

If the Supabase public schema already contains the PodShare tables but `_prisma_migrations` is missing, baseline the existing schema first:

```bash
cd apps/backend
npx prisma migrate resolve --applied 20260511142513_initial_podshare_schema
npx prisma migrate resolve --applied 20260511153030_add_pod_purchase_workflow
npx prisma migrate resolve --applied 20260511193000_add_notifications
npx prisma migrate resolve --applied 20260511194500_enable_rls_public_tables
npx prisma migrate resolve --applied 20260511195000_add_foreign_key_indexes
npx prisma migrate deploy
```

## 6. Run Locally

- `npm run dev:backend`
- `npm run dev --workspace frontend -- --host 127.0.0.1`

## 7. Test Critical Flows

- auth
- profile save
- add tracked subscription
- create pod
- send friend request
- send private pod invite
- accept invite
- add payment method
- run billing dry-run
