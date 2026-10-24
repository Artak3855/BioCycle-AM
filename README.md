# EcoLoop demo (working name)

Interactive full-stack demo: households deposit organic waste (simulated bins), earn points, redeem partner coupons; partners manage offers; admins see stats and a resource-recovery estimator. **All bins, weights, partners and recovery figures are simulated.** Roles are demo-only (no passwords, not production authentication).

Stack: React + Vite, Express, SQLite (better-sqlite3). One service serves the API and the built frontend.

## Run locally
```
npm install
cp .env.example .env      # optional; PORT, DB_PATH, SESSION_SECRET
npm run build && npm start   # http://localhost:3000
# or for development: npm run dev  (Vite on :5173, API on :3000)
```
The database is created and seeded automatically on first start (100 demo households, 5 fictional partners, 7 demo bins, ~6 weeks of deposits).

## Persistence (important)
SQLite is a file. Render's filesystem is ephemeral unless a **persistent disk** is attached, and disks need a paid plan (Starter or higher). `render.yaml` mounts a disk at `/var/data` and sets `DB_PATH=/var/data/ecoloop.db`. On the free plan, remove the `disk` block and set `plan: free`; the database is then recreated and reseeded on every redeploy or restart, so new deposits and redemptions will be lost. Sessions also reset if `SESSION_SECRET` is not set.

## GitHub
```
git init && git add . && git commit -m "EcoLoop demo"
git branch -M main
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

## Render
1. Render dashboard > New > Blueprint > pick the repo (uses `render.yaml`). Or New > Web Service with build `npm install && npm run build`, start `npm start`, health check `/api/health`.
2. Environment: `SESSION_SECRET` (random string), `DB_PATH=/var/data/ecoloop.db`, plus a disk mounted at `/var/data`.
3. Open the service URL.

## API (JSON; Bearer token from POST /api/session)
- GET /api/health
- POST /api/session {role: household|partner|admin}
- GET /api/me, GET /api/bins, GET/POST /api/deposits {binId, kg}
- GET /api/offers, POST /api/offers/:id/redeem, GET /api/coupons
- Partner: GET /api/partner/stats, POST /api/partner/offers, PUT /api/partner/offers/:id, POST /api/partner/coupons/use {code}
- Admin: GET /api/admin/stats, GET /api/admin/recovery?tonnes=&yield=&methane=, POST /api/admin/bins/:id/toggle

Server-side rules: roles checked from the signed token, weight 0.1 to 25 kg, points computed on the server, redemption in a single transaction with an atomic balance check, coupons usable once, basic per-IP throttling.

## Smoke test
Landing loads; /demo role buttons work; household dashboard loads; deposit 2.5 kg adds 25 points; redeem an offer (balance drops, coupon appears); redeeming with too few points is rejected; as partner, enter the coupon code twice (second is rejected); create, edit, disable an offer; admin stats and calculator load; refresh a deep link such as /app/admin; restart the service and confirm data persists (only with a disk).

## Not included
Armenian translation (copy is centralized in `src/text.js`), an interactive map, charts beyond the weekly bars, a contamination-incident table, and real authentication.
