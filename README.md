# PodShare

PodShare is a subscription-sharing platform for students. This workspace follows the technical spec in `/Users/nashy/Downloads/podshare-technical-spec.md` and is organized as a small monorepo:

- `apps/frontend`: React 18 + Vite + Tailwind CSS client
- `apps/backend`: Express + Prisma + PostgreSQL API
- `packages/shared`: shared constants and types

## Status

This repo now includes a working full-stack product scaffold with:

1. monorepo setup and shared package structure
2. Prisma schema for users, subscriptions, pods, friendships, invites, tracked subscriptions, payments, and billing records
3. Supabase magic-link auth flow and protected app routes
4. frontend pages for dashboard, subscriptions, pods, invites, friends, profile, and settings
5. private/public pod flows, invite inbox, member management, and per-pod billing visibility
6. payment-method management plus Stripe-ready setup-intent and webhook scaffolding

## Getting Started

1. Install dependencies from the repo root:
   `npm install`
2. Copy env templates:
   - `apps/backend/.env.example` to `apps/backend/.env`
   - `apps/frontend/.env.example` to `apps/frontend/.env`
3. Generate the Prisma client:
   `npm run prisma:generate`
4. Run the backend:
   `npm run dev:backend`
5. Run the frontend:
   `npm run dev:frontend`

## Useful Commands

- Install all dependencies:
  `npm install`
- Generate Prisma client:
  `npm run prisma:generate`
- Run backend typecheck:
  `npm run lint --workspace backend`
- Run frontend typecheck:
  `npm run lint --workspace frontend`
- Build backend:
  `npm run build --workspace backend`
- Build frontend:
  `npm run build --workspace frontend`

## Environment

Backend env template:
- [apps/backend/.env.example](/Users/nashy/PodShare/apps/backend/.env.example)

Frontend env template:
- [apps/frontend/.env.example](/Users/nashy/PodShare/apps/frontend/.env.example)

Key services you need for a real deployment:
- Supabase project
- PostgreSQL database URL
- Stripe account with webhook endpoint
- SendGrid sender

## Product Surface Implemented

Current code supports:

- Stanford-only magic-link auth
- profile editing
- friend requests and friend network
- tracked subscriptions and savings view
- public pod feed
- private pod invites
- pod owner administration
- payment-method management
- per-pod billing summaries
- Stripe setup-intent code path
- webhook and recurring-billing scaffolding

## Operational Docs

- Deployment and environment setup:
  [DEPLOYMENT.md](/Users/nashy/PodShare/DEPLOYMENT.md)
- Local/staging validation checklist:
  [TESTING_RUNBOOK.md](/Users/nashy/PodShare/TESTING_RUNBOOK.md)
- Product definition:
  [PRODUCT_REQUIREMENTS.md](/Users/nashy/PodShare/PRODUCT_REQUIREMENTS.md)

## Main Remaining Work

- connect to a real Supabase Postgres instance and run Prisma migrations
- configure real Stripe publishable/secret keys and webhook endpoint
- test live SetupIntent and off-session payment flows
- add deployment config for staging/production hosting
- complete compliance, policy, and production hardening
