# DockLog

Clinical supply warehouse management for hospitals and clinics. Central logistics stocks, holds, and replenishes clinics — with Pharmacy as source of supply (SOS) for drugs.

This repository is the **Phase 0 foundations** scaffold: domain schema, seed data, username/password auth, sign-in UI, and role-gated Logistics / Clinic module shells. Full receive / putaway / request / confirm flows are Phase 1.

## Stack

- **Next.js** (App Router) + TypeScript
- **PostgreSQL** via **Prisma**
- **Auth.js** (`next-auth` v5) — Credentials provider (username + password only; no SSO)
- Deploy target (documented, not configured here): **Vercel** + managed Postgres (Neon, Supabase, or Vercel Postgres)

## Prerequisites

- Node.js 20+
- PostgreSQL 16+ (Docker Compose below, local install, or a hosted connection string)

## Quick start

```bash
# 1. Install
npm install

# 2. Environment
cp .env.example .env
# Edit DATABASE_URL / AUTH_SECRET if needed

# 3. Start Postgres (Docker)
docker compose up -d

# 4. Migrate + seed
npx prisma migrate dev
npm run db:seed

# 5. Dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you will be redirected to sign-in.

### Demo users (password for all: `docklog123`)

| Username | Role | Module |
|----------|------|--------|
| `logistics.ops` | Logistics operator | Logistics |
| `logistics.admin` | Logistics admin | Logistics |
| `clinic.ortho` | Clinic supply (Orthopedics) | Clinic |
| `clinic.pharmacy` | Clinic supply (Pharmacy SOS) | Clinic |

## Environment variables

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH_SECRET` | Auth.js session secret (`openssl rand -base64 32`) |
| `AUTH_URL` | App origin (e.g. `http://localhost:3000`) |
| `NEXTAUTH_URL` / `NEXTAUTH_SECRET` | Aliases kept for compatibility |

For **Neon** or **Supabase**, paste the pooled/direct Postgres URL into `DATABASE_URL` (usually with `?sslmode=require`) and skip Docker.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Next.js dev server |
| `npm run build` | Generate Prisma client + production build |
| `npm run start` | Start production server |
| `npm run db:migrate` | `prisma migrate dev` |
| `npm run db:seed` | Re-seed demo hospital / users / items |
| `npm run db:studio` | Prisma Studio |

## Domain snapshot (Phase 0)

- **Hospital** — tenant boundary
- **Warehouse** — one per hospital
- **Location** — warehouse or clinic; `tempZone`: ambient / refrigerated / frozen / controlled room
- **Clinic** — customer of the warehouse; `logisticsPushEnabled`; `isPharmacySos` for Pharmacy drug SOS
- **User** — hospital-scoped roles (logistics admin/operator, clinic supply, auditor)
- **Item** — SKU, optional NDC/UPC, commodity class (`EXPENDABLE_MEDICAL_SUPPLY` \| `PHARMACY`)
- **Lot** + **InventoryBalance** — ledger key `(hospital, location, item, lot)`
- **AuditEvent** — append-only stub for later movement audit

Product rules encoded in seed/schema comments: logistics issues expendable medical supply; Pharmacy SOS is C2C source for drugs; cold chain is temp-zone flags only; keyboard entry (no barcode hardware).

## Auth choice

**Auth.js (NextAuth v5)** with the **Credentials** provider and JWT sessions. Passwords are hashed with **bcryptjs**. Middleware role-gates `/logistics` and `/clinic`. This keeps username/password-only sign-in simple for Phase 0 without SSO surface area.

## Hosting notes (later)

1. Create a managed Postgres database (Neon / Supabase / Vercel Postgres).
2. Set `DATABASE_URL` and a strong `AUTH_SECRET` in the Vercel project.
3. Run migrations against the remote DB (`npx prisma migrate deploy`).
4. Deploy the Next.js app to Vercel.

HIPAA-ready / self-hosted deployment is out of scope for early hosting.

## Out of scope (this scaffold)

- Full receive / putaway / request / confirm workflows
- SSO, MFA, barcode hardware, temperature logging
- Multi-warehouse / multi-hospital
- Live Vercel deploy from this PR
