# SmartStock

SmartStock is a small inventory and warehouse app for small businesses that store and move physical products. It tracks products, where they are stored, and every stock change, with an audit trail that can't be edited.

Built with Next.js (App Router), TypeScript, Tailwind CSS and Supabase (Postgres, Auth, Row Level Security).

## Features

Status: built and covered by automated database and validation tests. End-to-end checks against a hosted Supabase project are still to do (see [Verification status](#verification-status)).

- [x] Email/password sign-up, sign-in and sign-out (Supabase Auth). A personal workspace is created on first sign-in.
- [x] Product catalog: SKU, optional barcode, description, unit, cost/selling price, reorder level, primary location, archive/restore
- [x] Search by name, SKU or barcode. Filter by active/archived, low stock or location. Paginated.
- [x] Storage locations (`A-01-03` style codes): create, edit, deactivate/reactivate
- [x] Stock in, stock out and adjustments (set the counted quantity), all done atomically in the database
- [x] Movement history that can't be edited or deleted. Filter by product, type and date range.
- [x] Barcode lookup three ways: typed, USB/Bluetooth keyboard-wedge scanner, or phone camera (EAN-13, EAN-8, UPC-A, UPC-E, Code 128)
- [x] Dashboard: active products, units on hand, inventory value at cost, low-stock count and list, recent movements
- [x] One-click fictional demo data for empty workspaces
- [x] Animated public homepage at `/`: a photo deck that shuffles, a pinned image that expands as you scroll, a sideways feature gallery, a pinned how-it-works story and a photo mosaic with wipe reveals (GSAP, ScrollTrigger, SplitText, Lenis and three React Bits components). Animation turns off for visitors who prefer reduced motion. Signed-in users go straight to `/dashboard`.
- [x] Legal pages: Privacy Policy, Terms, Cookie Policy and Security, plus `robots.txt`, `sitemap.xml`, a web manifest and `/.well-known/security.txt`.
- [x] Privacy controls: download all workspace data as JSON, and delete your account permanently.
- [x] Responsive layout, keyboard support, live-region announcements, no meaning conveyed by colour alone

## Architecture

```
Browser ── forms / camera (client components)
   │  server actions only — the browser never talks to tables directly
Next.js server ── verifies the user (supabase.auth.getUser), validates with Zod
   │  user-scoped Supabase client (anon key + session cookie)
Postgres ── RLS on every table, column-level grants, record_stock_movement()
```

- `src/proxy.ts` refreshes the session cookie and sends signed-out visitors to `/login`. Every page and action checks the user again on the server.
- `src/lib/auth.ts` → `getContext()` returns the verified user and their workspace (from the `ensure_workspace()` RPC). Workspace and actor IDs never come from the browser.
- `src/lib/barcode/camera.ts` wraps ZXing (`@zxing/browser`) so the decoder can be swapped without touching the UI.

### Data model

| Table | Purpose |
| --- | --- |
| `workspaces`, `workspace_members` | Tenant + membership (`owner` / `staff`) |
| `locations` | Bins/shelves. Code is stored upper-case, unique per workspace. |
| `products` | Catalog + `quantity_on_hand`. SKU unique per workspace (case-insensitive), barcode unique when set. Barcode is `text`, so leading zeroes are kept. `is_low_stock` is a generated column. |
| `stock_movements` | Append-only ledger: type, signed delta, before/after, reason, reference, actor, location |

Composite foreign keys (`(workspace_id, id)`) mean a product can only point at a location in its own workspace, and a movement can only point at a product in its own workspace.

Each product has **one quantity and one primary location**. This MVP does not track per-bin balances.

### The stock ledger

`record_stock_movement(product, type, quantity, reason, reference, idempotency_key)` is the **only** way stock changes:

1. Checks the caller's role in the product's workspace (before taking any lock).
2. Locks the product row (`SELECT … FOR UPDATE`), so concurrent movements on one product run one at a time.
3. Works out the delta. Stock-out turns a positive quantity into a negative delta. An adjustment takes the *counted* quantity and calculates the delta while it holds the lock, so a stale browser value can't overwrite newer activity.
4. Rejects a result below zero (`INSUFFICIENT_STOCK`), archived products, and adjustments that change nothing.
5. Updates the balance and inserts the movement in the same transaction. Both commit, or neither does.
6. If the idempotency key was already used, returns the original movement and changes nothing. The form makes one key per submission and reuses it on retry.

Application roles have no `INSERT`/`UPDATE`/`DELETE` grant on `stock_movements` and no grant on `products.quantity_on_hand`. A trigger also blocks `UPDATE` on movements, even for the table owner.

### Metric definitions

- **Low stock:** active, `reorder_level > 0` and `quantity_on_hand <= reorder_level`
- **Units on hand:** sum of active product quantities. This adds different units together (each, box, roll…), and the dashboard says so.
- **Inventory value:** `quantity × cost_price` for active products that have a cost price. Products with no cost are left out and the dashboard shows how many. Selling price is never used.
- Dashboard numbers come from the database when the page loads. They are not live-updating.

## Security

- RLS is on for every table, and access is denied unless a policy allows it. A row is visible only to members of its workspace (`is_workspace_member()`). Owners can insert or update products and locations. Owners and staff can record stock through the RPC.
- The helper functions are `SECURITY DEFINER` with `search_path = ''` and execute rights for `authenticated` only. They read `workspace_members` directly, so policies don't recurse.
- `anon` has no privileges on any business table.
- Column-level grants block the browser from setting `quantity_on_hand`, `workspace_id` on update, `created_by`, or anything else that must be trusted.
- No service-role key is used anywhere. Only `NEXT_PUBLIC_SUPABASE_URL` and the anon/publishable key are needed.
- Per-request Content-Security-Policy, set in `src/proxy.ts`. Scripts need a fresh nonce (`strict-dynamic`). Styles allow inline, because the dev server, fonts and animation libraries inject `<style>` tags. `frame-ancestors none`, `form-action self`, `object-src none`.
- Other headers: HSTS (production only), COOP/CORP same-origin, nosniff, a strict referrer policy, and a permissions policy where only the camera is allowed, on this site only.
- Rate limits (in memory, per server instance): sign-in per IP and per email, sign-up per IP, stock changes and lookups per user, data export and account deletion.
- New passwords need 10+ characters with a letter and a number. **Also set this in Supabase** (Authentication → Sign In / Providers → Email → minimum password length and password requirements). The anon key is public, so someone could call Supabase Auth directly and skip the app's rules.
- Recommended in the Supabase dashboard: leaked-password protection, CAPTCHA on sign-up, and email confirmation in production.
- Legal pages use placeholder operator and contact details. Edit `src/lib/site.ts` (and set `NEXT_PUBLIC_SITE_URL`) before going live, and have the text reviewed for your jurisdiction.
- Search terms have PostgREST filter syntax stripped before use. All other values go through the client library's parameter handling.

## Setup

Requirements: Node 20.9+ (developed on Node 26) and npm. Postgres **15 or newer** (needed for `ON DELETE SET NULL (column)`); new Supabase projects meet this.

```bash
npm install
cp .env.example .env.local   # then fill in your Supabase URL and anon/publishable key
```

### Database

Apply the migrations in `supabase/migrations/` **in order**. Pick one way:

- **Supabase SQL editor:** paste and run `20261029000001_init.sql`, then `20261029000002_demo_data.sql`, then `20261030000003_account_deletion.sql`, then `20261030000004_currency_and_demo_unload.sql`, then `20261030000005_price_entry_currency.sql`.
- **Supabase CLI:** `supabase link --project-ref <ref>` and then `supabase db push`.

### Auth settings (Supabase dashboard → Authentication)

- **URL configuration:** set Site URL to your production URL. Add redirect URLs for `http://localhost:3000/**`, your Vercel preview pattern, and production.
- **Email confirmation:** the app supports both settings. If it's on, sign-up shows "check your inbox" and the email link lands on `/auth/confirm`. Turning it off makes local demos faster.

### Run

```bash
npm run dev
```

Sign up, then either follow the empty-state steps or click **Load demo data** on the dashboard. That adds 10 fictional products, 4 locations and some sample movements. Demo barcodes use the reserved in-store `02…` EAN-13 prefix, so they scan without clashing with real products.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server on http://localhost:3000 |
| `npm run build` | Production build (includes type check) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint (Next.js core-web-vitals + TypeScript) |
| `npm test` | Vitest: database tests + validation tests |

## Testing

`npm test` runs two suites.

- **`tests/db`**: loads the real migrations into an in-process Postgres 17 ([PGlite](https://pglite.dev)). It uses a minimal stand-in for Supabase's `auth` schema and `anon`/`authenticated` roles, and runs queries as a normal `authenticated` user. It covers:
  - stock in, out and adjust, with exact before/after/delta values
  - negative stock rejected with nothing changed
  - rollback when the movement insert fails after the balance update
  - idempotent retry
  - archived products blocked
  - direct quantity or movement writes denied
  - movement updates blocked even for the table owner
  - cross-workspace reads, writes and location links blocked
  - anonymous access denied
  - case-insensitive SKU and barcode uniqueness, with leading zeroes kept
  - inactive locations rejected
  - low-stock flag, demo data, and that the ledger and balances agree
- **`tests/unit`**: Zod validation (normalising input, keeping leading zeroes, price precision, integer bounds) and the error-message mapping.

The tests do **not** cover:
- **Real concurrency.** PGlite is single-connection. The guarantee comes from the `FOR UPDATE` row lock, which needs a multi-connection Postgres to stress-test.
- PostgREST query strings, the browser UI and camera scanning. Those need a live Supabase project and a device.

## Verification status

| Check | Status |
| --- | --- |
| Type check, lint, production build | Passing locally |
| DB + unit tests (42) | Passing locally |
| Login page renders, redirect for signed-out users, form validation | Checked by hand in a local browser |
| Full flows against a hosted Supabase project | **Not yet done** |
| Camera scanning on a real phone | **Not yet done** |
| Vercel deployment | **Not yet done** |

## Deployment (Vercel)

1. Push the repo to GitHub and import it in Vercel.
2. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` separately for Preview and Production.
3. Run migrations **before** deploying code that depends on them.
4. Add the Vercel domains to Supabase Auth redirect URLs.
5. The camera needs HTTPS, which Vercel provides. On plain-HTTP LAN addresses the camera is unavailable and the page offers manual entry instead.
6. After deploying, sign in with a test account, confirm you can't see another account's data, and search the built JS for `service_role` to make sure no service key shipped.

Rollback: these migrations only add objects. To undo them, drop the functions and tables, which **deletes the data**. Take a backup first.

## Known limitations

- One quantity and one primary location per product. No per-bin balances, transfers, lots, serials or expiry dates.
- Single-owner workspaces. The `staff` role exists in the schema and policies, but there is no UI to invite members.
- The actor column shows "You" or a short member ID, because user emails are not readable through RLS.
- Times are shown in UTC, and date filters use UTC days.
- No offline mode, notifications or CSV import/export.

## Resume summary

> Built SmartStock, a responsive inventory management app using Next.js, TypeScript and Supabase, with barcode-based product lookup (camera, USB scanner, manual), PostgreSQL row-level security, and an atomic, append-only stock movement ledger verified by database-level tests.
