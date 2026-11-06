# DockLog

Clinical supply warehouse management for hospitals and clinics. Central logistics stocks, holds, and replenishes clinics — with Pharmacy as source of supply (SOS) for drugs.

This repository includes Phase 0–2 foundations plus a **Phase 3 compliance slice**: recall campaigns (lot hold + clinic return tasks) and a filterable audit log with CSV export.

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

## Phase 1 demo path

1. **Logistics receive** (`logistics.ops`) → Receive → pick an item, lot, expiry, qty, warehouse location. Cold items are blocked from ambient bins.
2. **Warehouse on-hand** → confirm balances.
3. **Clinic request** (`clinic.ortho`) → Requests → request gloves/gauze (routes to logistics) or insulin (routes to Pharmacy SOS).
4. **Logistics fulfill** (`logistics.ops`) → Issue / fulfill → fulfill the open request **or** push expendable supply to Ortho/Pharmacy (push-enabled). Med-Surg has push off (request-only).
5. **Clinic confirm** (`clinic.ortho`) → Confirm receipt into Ortho cart → On-hand updates.
6. **Pharmacy C2C** (`clinic.ortho` requests insulin → `clinic.pharmacy` fulfills from Pharmacy stock on Requests page → Ortho confirms).

Rules enforced in code: logistics issues expendable medical supply to clinics; logistics may also supply Pharmacy; pharmacy drugs to other clinics go Pharmacy SOS C2C only.

Item fields on **Receive**, **Requests**, and logistics **Issue (push)** use a keyboard typeahead (search SKU / name / NDC / UPC) so large catalogs stay usable.

## Phase 2 demo path (`logistics.ops` / `docklog123`)

1. **Short/over receive** → Receive → set Expected qty ≠ Actual qty → enter variance note → post (audit `RECEIVE_SHORT` / `RECEIVE_OVER`).
2. **FEFO picks** → Issue → search gloves → lot list is earliest-expiry first (`GLV-NEAR-EXP` before longer-dated lot) with near-expiry warning.
3. **Par / replenish** → Par / replenish → Ortho gloves/gauze below par → “Suggest push” opens Issue prefilled for push-enabled clinics.
4. **Cycle count** → Cycle count → pick warehouse location + lot → enter counted qty → on-hand adjusts with `CYCLE_COUNT` audit.
5. **PO / ASN** → PO / ASN → create or use seed `PO-2026-DEMO` → Receive against line (short/over OK).
6. **Print slip** → Pick lists → Print slip (or Confirm receipt → Print slip).
7. **Clinic transfer** (`clinic.ortho`) → Transfer out expendable to Med-Surg → Med-Surg/Ortho confirm path on destination; drugs only from `clinic.pharmacy`.

## Phase 3 demo path

1. **Open recall** (`logistics.ops`) → Recalls → lot `GZ-2025-118` (gauze at Ortho cart + warehouse) → reason → Open recall & hold lot.
2. **Hold enforced** → Issue that gauze lot fails while on hold.
3. **Clinic return** (`clinic.ortho`) → Recalls → Mark returned → logistics Recalls → Confirm return into warehouse bin.
4. **Audit** → Audit → filter by action / date / search → Export CSV.

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

## Domain snapshot

- **Hospital** — tenant boundary
- **Warehouse** — one per hospital
- **Location** — warehouse or clinic; `tempZone`: ambient / refrigerated / frozen / controlled room
- **Clinic** — customer of the warehouse; `logisticsPushEnabled`; `isPharmacySos` for Pharmacy drug SOS
- **User** — hospital-scoped roles (logistics admin/operator, clinic supply, auditor)
- **Item** — SKU, optional NDC/UPC, commodity class (`EXPENDABLE_MEDICAL_SUPPLY` \| `PHARMACY`)
- **Lot** (`onHold`) + **InventoryBalance** — ledger key `(hospital, location, item, lot)`
- **SupplyRequest** + lines — clinic requests; channel `LOGISTICS` or `PHARMACY_SOS`
- **Transfer** + lines — issue/push/C2C/clinic transfer; `ISSUED` then `CONFIRMED`
- **ClinicParLevel** — per clinic+item par qty for replenishment
- **InboundShipment** + lines — lightweight PO/ASN expected receipts
- **RecallCampaign** + **RecallReturnTask** — lot hold + clinic return / confirm
- **AuditEvent** — append-only; filterable UI + CSV at `/logistics/audit`

## Auth choice

**Auth.js (NextAuth v5)** with the **Credentials** provider and JWT sessions. Passwords are hashed with **bcryptjs**. Middleware role-gates `/logistics` and `/clinic`.

## Hosting notes (later)

1. Create a managed Postgres database (Neon / Supabase / Vercel Postgres).
2. Set `DATABASE_URL` and a strong `AUTH_SECRET` in the Vercel project.
3. Run migrations against the remote DB (`npx prisma migrate deploy`).
4. Deploy the Next.js app to Vercel.

## Out of scope (still)

- SSO, MFA, barcode hardware, temperature logging/excursions
- Full PO/ASN EDI / vendor integrations (lightweight PO headers only)
- ERP/MMIS, EHR hooks, multi-warehouse / multi-hospital
- Full DEA controlled-substance workflow beyond Pharmacy SOS rules
- Live Vercel deploy from this PR
