# PodShare Testing Runbook

This runbook is for local and staging validation of the current codebase.

## 1. Static Verification

Run these from the repo root:

```bash
npm install
npm run prisma:generate
npm run lint --workspace backend
npm run build --workspace backend
npm run lint --workspace frontend
npm run build --workspace frontend
```

These checks should pass before any staging deploy.

## 2. Local Environment Preparation

Copy env templates:

```bash
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env
```

Then replace placeholder values with real test credentials where available.

For local Supabase testing, use:

- `APP_URL=http://127.0.0.1:5173`
- Supabase auth redirect URLs:
  - `http://127.0.0.1:5173/login/verify`
  - `http://localhost:5173/login/verify`
- Supabase Session Pooler URI for `DATABASE_URL`

Apply remote database migrations from the backend workspace:

```bash
cd apps/backend
npx prisma migrate deploy
```

## 3. Auth Flow Test

Goal:
- confirm Stanford-only magic-link login works

Checklist:
- non-Stanford email is rejected with `Only Stanford emails are allowed.`
- request magic link from `/login`
- email sends successfully
- verify redirect lands on `/login/verify`
- frontend session persists
- protected routes become accessible
- `/api/auth/me` returns user data

## 4. Profile Flow Test

Checklist:
- update name
- update major
- update year
- update avatar URL
- refresh page
- confirm profile changes persist

## 5. Subscription Tracking Test

Checklist:
- add a personal subscription
- add a shared subscription
- verify both appear in `/subscriptions`
- verify dashboard monthly spend updates
- verify monthly savings updates
- remove a subscription and confirm totals recalculate

## 6. Friends Flow Test

Checklist:
- send friend request from account A to account B
- verify request appears in account B
- accept request in account B
- verify both users see the connection in `Friends`

## 7. Pod Flow Test

### Public pod

Checklist:
- create a public pod
- verify it appears in `/pods`
- open pod detail while unauthenticated if allowed by current route protection
- join pod from another authenticated account
- verify membership appears

### Private pod

Checklist:
- create a private pod
- verify it does not appear in the public feed
- invite another user
- verify invite appears in `/invites`
- accept invite
- verify pod becomes visible to invitee
- verify credentials remain hidden until member status allows visibility

## 8. Pod Owner Management Test

Checklist:
- host views pending members
- approve pending member
- remove active member
- verify non-owner cannot approve/remove members

## 9. Payment Method Test

### Manual fallback

Checklist:
- save a payment method reference manually
- mark a default method
- delete a method
- verify settings summary updates

### Stripe setup flow

Checklist:
- configure real Stripe test keys
- save card through Stripe Elements in settings
- verify method record is created
- verify default payment method appears in settings summary

## 10. Per-Pod Billing Test

Checklist:
- open pod detail
- verify current cycle billing panel appears
- verify member billing rows appear
- record `Pay My Share`
- verify payment status becomes `COMPLETED`
- verify collected total updates

## 11. Billing Automation Test

Checklist:
- open Settings
- run `Dry Run`
- verify hosted pod preview exists
- run real billing automation in Stripe test mode
- verify result statuses return for hosted pods
- verify webhook updates payment states when Stripe events arrive

## 12. Webhook Test

Checklist:
- use Stripe CLI or Stripe dashboard test webhook
- send `payment_intent.succeeded`
- confirm payment record updates to `COMPLETED`
- send `payment_intent.payment_failed`
- confirm payment record updates to `FAILED`

## 13. Final Staging Smoke Test

Before production, verify:

- auth works
- dashboard loads
- friends work
- pod creation works
- invites work
- payment method save works
- manual or Stripe payment path works
- billing automation preview runs
- no critical console/server errors
