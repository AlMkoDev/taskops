# TaskOps Core

Clean task-ops codebase scaffolded alongside the existing Scheduler app.

## Run

From `C:\Schedular\taskops`:

```bash
npm run dev
```

## PostgreSQL

Set `DATABASE_URL` before starting the app to enable the PostgreSQL-backed Reports module.

Example:

```bash
DATABASE_URL=postgres://postgres:postgres@localhost:5432/taskops
```

Optional:

```bash
POSTGRES_SSL=true
REQUIRE_DATABASE=true
```

On first API use, the app bootstraps the report tables automatically and migrates any legacy JSON-backed report, audit, and notification data into PostgreSQL if the tables are empty.

For production, set `REQUIRE_DATABASE=true`. This prevents the app from accepting writes into local JSON fallback storage when `DATABASE_URL` is missing or unreachable.

You can also run migrations explicitly:

```bash
npm run db:migrate
```
