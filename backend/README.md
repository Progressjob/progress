# Ethiojobs-style Backend

NestJS 10, Prisma 5, and PostgreSQL backend for
`../doc/ethiojobs_style_backend_architecture.md`.

Implemented roles:

- Admin/moderator: companies, employer accounts, taxonomy, job publishing,
  reports, users, contact messages, dashboard, and audit logs.
- Employer: company details, jobs, applicant tracking, status history,
  interviews, CV access, and job statistics.
- Candidate: profile, education, experience, skills, CVs, applications,
  saved jobs, application history, and notifications.

Payments, subscriptions, invoices, and job alerts are deferred.
`JobPostingPolicy` is the extension point for future posting allowances.

## Requirements

- Node.js 20 or 22
- npm
- PostgreSQL 16+ installed locally and running (default port 5432)

## Local setup

1. Create an empty database named `ethiojobs` in your local PostgreSQL instance
   (pgAdmin, `psql`, or your installer’s tools).
2. Copy environment variables and set `DATABASE_URL` to match your user and password.

```bash
cd backend
npm install
cp .env.example .env
npm run prisma:deploy
npm run prisma:seed
npm run dev
```

(`npm run start:dev` is equivalent.)

On Windows PowerShell, use `Copy-Item .env.example .env`.

Example connection string (adjust user/password as needed):

`postgresql://postgres:1234@localhost:5432/ethiojobs?schema=public`

The API base is `http://localhost:3000/api/v1`. Swagger is at
`http://localhost:3000/api/docs`; health is at `/api/v1/health`.
A React + Vite frontend harness is available in `../frontend` (`cd ../frontend && npm run dev`).

Development seed logins:

- Admin: `ADMIN_EMAIL` / `ADMIN_PASSWORD`
- Employer: `employer@example.com` / `Employer123!`
- Candidate: `candidate@example.com` / `Candidate123!`

Change all development passwords before exposing the service.

## Troubleshooting

### `EADDRINUSE: address already in use :::3000`

The API defaults to port 3000 ([`PORT`](.env.example)). Nest can bootstrap fully and still exit if another process already listens on that port—often a **second** terminal running `npm run dev` or `npm run start:dev`.

1. Run **only one** watch-mode backend at a time.
2. Find what holds the port (Windows):

   ```bash
   netstat -ano | findstr :3000
   taskkill /PID <pid_from_last_column> /F
   ```

3. Start again: `npm run dev`.
4. Confirm: `http://localhost:3000/api/v1/health` should return 200.

Watch-mode restarts rely on graceful shutdown; avoid force-killing Node unless the port stays stuck.

### `Cannot find module '.../dist/main'`

[`nest-cli.json`](nest-cli.json) uses `"deleteOutDir": true`, so `dist/` is wiped on each watch rebuild. Do **not** run `npm run build && npm run start:prod` while `npm run dev` is active in another terminal—build output can disappear mid-run. Stop watch first, then build and `npm run start:prod`.

### TypeScript watch errors block restarts

If the compiler reports errors (for example invalid `ignoreDeprecations` or missing `vitest/globals` types), fix [`tsconfig.json`](tsconfig.json) / [`tsconfig.build.json`](tsconfig.build.json) before expecting the server to reload. An old Node process may still hold port 3000 until you stop it.

## Environment

Copy `.env.example`; never commit `.env`.

- `DATABASE_URL`: PostgreSQL connection string.
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`: different secrets, at least 32 characters.
- `JWT_ACCESS_TTL`: access-token lifetime; default `15m`.
- `JWT_REFRESH_TTL_DAYS`: rotating refresh-token lifetime.
- `STORAGE_ROOT`: private local file directory. Replace this adapter with
  S3-compatible storage in multi-instance production.
- `MAX_UPLOAD_BYTES`: desired upload ceiling. HTTP currently enforces 5 MiB.
- `EMPLOYER_SELF_POSTING`: reserved gate; admin posting is the active flow.
- SMTP variables are optional; without them mail uses a JSON development transport.

## Database operations

```bash
# Create a development migration after schema changes
npm run prisma:migrate

# Apply committed migrations in CI/production
npm run prisma:deploy

npm run prisma:generate
npm run prisma:seed
```

The initial migration includes check constraints, the one-default-resume partial
unique index, and the job-search `tsvector` trigger/GIN index that Prisma cannot
express directly. Preserve these additions when generating later migrations.

Backup/restore smoke check:

```bash
pg_dump "$DATABASE_URL" --format=custom --file=ethiojobs.dump
createdb ethiojobs_restore
pg_restore --dbname=ethiojobs_restore --clean --if-exists ethiojobs.dump
```

## Tests and quality checks

```bash
npm run build
npm test
npm run lint

# Use a dedicated, migrated and seeded database
TEST_DATABASE_URL=postgresql://postgres:1234@localhost:5432/ethiojobs_test npm run test:e2e
```

The e2e suite is skipped when `TEST_DATABASE_URL` is absent so a normal unit
run never modifies a developer database.

Important protections:

- unique `(job_id, candidate_id)` prevents duplicate applications;
- the apply transaction checks publication status and deadline;
- resume ownership and screening question ownership are checked;
- each application status mutation writes an event in the same transaction;
- employer queries require active membership in the target company;
- private CV downloads require owner, admin, or authorized applicant access.

## Production

Run `npm run build`, `npm run prisma:deploy`, then `npm run start:prod`.
Terminate TLS at a trusted proxy, restrict CORS, use a secret manager and private
object storage, scan uploaded documents, configure SMTP, centralize logs, and
schedule PostgreSQL backups. Replace local storage before running multiple app
instances.
