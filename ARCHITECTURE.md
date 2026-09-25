# Backend Architecture

`src/server.js` boots the app: DB check → `ensureSchema`
(additive helper tables) → `app.listen` → background jobs.

## Folder map

| Folder | Purpose |
|---|---|
| `src/config/` | `db.js` (MySQL pool), `ensureSchema.js` (self-creates helper tables `IF NOT EXISTS` on boot) |
| `src/middleware/` | `auth.js` (JWT), `permission.middleware.js` (role/permission check, admin bypass), `maintenance.js` (503 guard for non-admins), rate limits, CSV upload, QR-scan guard |
| `src/routes/` | **Only mounted routers live here.** Mounted in `index.js` under `/api`. Unmounted drafts live in `src/_archive/` |
| `src/controllers/` | One controller per domain, called only from mounted routes |
| `src/jobs/` | `weeklyAttendance.job.js` (WhatsApp summaries), `weeklyEmail.job.js` (Resend reports) — interval-tick schedulers started by `server.js`, never crash the boot |
| `src/utils/` | Shared helpers: `platformSettings.js` (DB-backed settings + cache), `attendanceSummary.js` (shared math), `mailer.js` (nodemailer), `resend.js` (Resend sender), `weeklyEmail.js` (email template), `qr.js`, `jwt.js`, `validation.js` |
| `src/docs/` | OpenAPI spec (`openapi.js` + `paths/*.js`), served at `/api-docs`. Every mounted route must be documented (enforced by `scripts/verify-swagger.js`) |
| `src/_archive/` | Unmounted drafts, documented in its own README. Safe to ignore at runtime |

## Conventions

- Routes: `authenticate` → `requirePermission("domain.action")` → controller. Controllers use parameterized `pool.query` only.
- Settings: `platform_settings` (public, safe keys) and `weekly_email_settings` tables; admin edits via `/api/admin/*`; runtime schedule changes need no restart.
- Migrations: numbered SQL in `scripts/migrations/` **plus** mirrored `IF NOT EXISTS` creation in `ensureSchema.js` so Railway deploys need no manual SQL.
- Verification (no DB needed): `node scripts/verify-swagger.js`, `node scripts/verify-platform-settings.js`, `node scripts/verify-weekly-email*.js`.
