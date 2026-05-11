# PodShare

PodShare is a full-stack subscription-sharing platform for students. It helps users track recurring subscriptions, form shared subscription groups called pods, invite friends, discover public shares, and split payments through a Stripe-ready billing flow.

The product is built as a TypeScript monorepo with a React frontend, Express API, Prisma data model, Supabase authentication, and Stripe payment scaffolding.

## Current Status

PodShare is in active MVP development. The repository includes the core application structure and product flows, with live Supabase/Stripe integration still being wired and tested.

Implemented so far:

- Stanford-only magic-link authentication flow
- Protected frontend routes and profile management
- Subscription tracking with monthly spend and savings summaries
- Public and private pod creation flows
- Pod member management, invite flows, and join requests
- Friend requests and friend network primitives
- Payment method setup flow using Stripe SetupIntents
- Stripe webhook and recurring billing scaffolding
- Prisma schema covering users, pods, memberships, subscriptions, payments, invites, and billing records

## Tech Stack

- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, React Router
- **Backend:** Node.js, Express, TypeScript, Prisma
- **Database:** PostgreSQL through Supabase
- **Auth:** Supabase Auth
- **Payments:** Stripe
- **Package management:** npm workspaces

## Repository Structure

```text
apps/
  backend/      Express API, Prisma schema, billing/auth routes
  frontend/     React client, protected pages, dashboard and pod UI
packages/
  shared/       Shared constants and TypeScript types
scripts/        Local validation utilities
```

## Getting Started

Install dependencies:

```bash
npm install
```

Create local environment files from the templates:

```bash
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env
```

Generate the Prisma client:

```bash
npm run prisma:generate
```

Run the backend:

```bash
npm run dev:backend
```

Run the frontend:

```bash
npm run dev:frontend
```

The frontend runs at `http://localhost:5173` and the backend runs at `http://localhost:4000` by default.

## Useful Commands

```bash
npm run validate-env
npm run lint --workspace frontend
npm run lint --workspace backend
npm run build --workspace frontend
npm run build --workspace backend
```

## Environment

Environment templates are committed, but real secrets are intentionally ignored.

- Backend template: [apps/backend/.env.example](apps/backend/.env.example)
- Frontend template: [apps/frontend/.env.example](apps/frontend/.env.example)

Services needed for live staging:

- Supabase project and PostgreSQL connection string
- Stripe test-mode keys and webhook endpoint
- SendGrid API key or another email provider
- Frontend and backend hosting targets

## Product Areas

- **Dashboard:** monthly spend, savings, owned pods, joined pods, and next actions
- **Subscriptions:** manual tracking for personal and shared recurring expenses
- **Pods:** public discovery, private sharing, owner controls, member states, and credentials storage hooks
- **Friends and invites:** friend requests, direct pod invites, and invite inbox
- **Payments:** payment method setup, payment records, billing status, and webhook handlers

## Roadmap

- Connect to a live Supabase Postgres instance and run migrations
- Validate magic-link authentication end to end
- Configure Stripe test keys and webhook forwarding
- Test SetupIntent and off-session payment flows
- Add staging deployment configuration
- Add automated test coverage for high-risk billing and visibility rules
- Complete production hardening for credentials, access revocation, compliance, and monitoring

## Docs

- [Product requirements](PRODUCT_REQUIREMENTS.md)
- [Deployment notes](DEPLOYMENT.md)
- [Live setup checklist](LIVE_SETUP_CHECKLIST.md)
- [Testing runbook](TESTING_RUNBOOK.md)
