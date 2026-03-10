# Next Stock

Turkish version: [README.tr.md](/Users/rafet/Desktop/next-stock/README.tr.md)

`next-stock` is a Next.js inventory and order management app for tracking customers, products, orders, deliveries, and stock movements from a single interface.

The app is built for internal operations rather than public e-commerce. It focuses on:

- customer-specific product catalogs
- order entry and fulfillment tracking
- delivery and return registration
- stock ledger visibility
- dashboard metrics and monthly reporting
- bilingual UI (`en`, `tr`)

## Main modules

### Dashboard

The home page shows operational summaries and charts:

- total order amount
- delivered order amount
- open order amount
- monthly orders, deliveries, revenue, and delivered revenue

Dashboard filters support year and customer selection. Amounts can be shown in the user's preferred currency using exchange-rate conversion in the client store.

### Orders

The orders module manages sales orders linked to customers.

- standard order items reference products
- custom order items support non-catalog work
- order statuses are stored as:
  `KAYIT`, `ÜRETİM`, `KISMEN HAZIR`, `HAZIR`, `BİTTİ`, `İPTAL`
- orders support search, filtering, sorting, pagination, and edit flows

### Order Tracking

The order tracking view is a fulfillment-focused view separate from the main orders table. It is intended for following progress and remaining quantities without mixing that concern into the order-entry screen.

### Products

The products module stores customer-linked products and technical details:

- product code and name
- unit, price, and currency
- stock quantity and minimum stock level
- alternate codes
- material, coating, post-process, specifications, and notes

Products can be created, edited, and adjusted for stock corrections.

### Stock Movements

Every stock-changing action is represented in the stock ledger. Movement types include:

- `IN`
- `OUT`
- `DELIVERY`
- `RETURN`
- `ADJUSTMENT`
- `INITIAL`
- `TRANSFER`

Movement rows can optionally reference the source record that caused the change, such as an order adjustment or delivery.

### Deliveries

Deliveries are recorded separately from orders and can be created as either:

- `DELIVERY`
- `RETURN`

Delivery items point back to either a standard order item or a custom order item. Recording a delivery or return also creates stock movement entries so physical stock and the ledger stay aligned.

### Customers

Customers are first-class records and are used to scope:

- products
- orders
- deliveries
- dashboard filters

### Maintenance

The maintenance screen is admin-only. It provides a stock integrity report that compares:

- shelf stock stored on the product record
- ledger stock calculated from stock movements

Admins can reconcile mismatches by updating product stock to match the ledger.

## Core workflow

The app models a fairly direct operational flow:

1. Create customers.
2. Create products for those customers.
3. Create orders with product items or custom items.
4. Track fulfillment from the order tracking view.
5. Register deliveries or returns.
6. Review stock movements and integrity mismatches.

## Data model

Core tables defined in [db/schema.ts](/Users/rafet/Desktop/next-stock/db/schema.ts):

- `customers`
- `products`
- `orders`
- `order_items`
- `custom_order_items`
- `deliveries`
- `delivery_items`
- `stock_movements`
- `users`
- `sessions`
- `login_attempts`
- `rate_limits`

Important relationships:

- a customer has many products, orders, and deliveries
- an order has many standard items and optional custom items
- a delivery item references exactly one order item source
- stock movements belong to a product and the user who created them

## Auth and access

Authentication is session-based and backed by PostgreSQL.

- users log in with username and password
- passwords are verified with `bcryptjs`
- sessions are stored in the `sessions` table and persisted in an HTTP-only cookie
- login protection includes global rate limiting and per-user/IP attempt tracking
- admin-only access currently gates maintenance actions

Relevant files:

- [app/actions/auth.ts](/Users/rafet/Desktop/next-stock/app/actions/auth.ts)
- [lib/auth/index.ts](/Users/rafet/Desktop/next-stock/lib/auth/index.ts)
- [lib/auth/roles.ts](/Users/rafet/Desktop/next-stock/lib/auth/roles.ts)

## Localization and user settings

The app supports English and Turkish.

- locales: `en`, `tr`
- default locale: `en`
- locale is detected from cookie or `Accept-Language`
- timezone is detected from the request and stored in a cookie
- theme selection supports `light`, `dark`, and `system`

## Tech stack

- Next.js App Router
- React 19
- TypeScript
- PostgreSQL
- Drizzle ORM + Drizzle Kit
- TanStack Query
- TanStack Table
- next-intl
- Zustand
- Tailwind CSS v4
- Recharts
- shadcn/ui style components

## Project structure

```text
app/          Routes, layouts, server actions, API handlers
components/   Feature UI and reusable table/form primitives
db/           Drizzle schema and database exports
drizzle/      SQL migrations
hooks/        Shared React hooks
lib/          Queries, server services, auth, search params, utilities, i18n
stores/       Client state such as exchange rates
```

## Local development

### Requirements

- Node.js
- pnpm
- PostgreSQL

### Environment

Create `.env` with:

```bash
DATABASE_URL=postgres://USER:PASSWORD@HOST:PORT/DB_NAME
```

### Install and run

```bash
pnpm install
pnpm db:migrate
pnpm dev
```

Open `http://localhost:3000`.

## Scripts

```bash
pnpm dev
pnpm build
pnpm start
pnpm test
pnpm lint
pnpm db:generate
pnpm db:migrate
pnpm db:studio
```

## Datetime QA checklist

Timezone and date filtering behavior should follow these assumptions:

- all timestamps are stored as `timestamptz`
- `startDate` and `endDate` filters represent local calendar days in the resolved user timezone
- date range queries use `>= startOfDayUtc` and `< nextDayStartUtc`

Reference scenarios:

1. `Europe/Istanbul`, filter `2026-03-01..2026-03-01`
   Included UTC range: `2026-02-28T21:00:00.000Z` to `<2026-03-01T21:00:00.000Z`
2. `America/New_York`, DST spring-forward day `2026-03-08`
   Included UTC range: `2026-03-08T05:00:00.000Z` to `<2026-03-09T04:00:00.000Z`
3. Month boundary bucketing
   `2026-03-31T22:30:00.000Z` maps to `2026-04` in `Europe/Istanbul` and `2026-03` in `America/New_York`

Manual QA checks:

- orders page date filters should match local-day expectations for the resolved timezone
- dashboard totals should stay consistent when changing only display timezone unless boundaries actually change
- monthly overview bucketing should follow local month boundaries, not UTC month boundaries
- product lifecycle and stock movement timestamps should render in the resolved timezone
- invalid timezone cookie values should fall back gracefully to UTC behavior

## Notes for operators and developers

- The app assumes users already exist in the database; there is no seed or signup flow in the repository.
- The `report` route redirects to maintenance.
