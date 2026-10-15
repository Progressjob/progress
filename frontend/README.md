# Ethiojobs-style Frontend Harness (React + Vite)

Functional React + Vite + TypeScript frontend connected to the NestJS backend (`../backend`) and built around the flows described in [`../doc/frontend_api_guide.md`](../doc/frontend_api_guide.md).

## Prerequisites

- Backend running on `http://localhost:3000` (`cd ../backend && npm run dev`)
- PostgreSQL database migrated and seeded (`cd ../backend && npm run prisma:deploy && npm run prisma:seed`)

## Quick Start

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

Vite proxies `/api` requests to `http://localhost:3000` in development (`.env.development` sets `VITE_API_BASE_URL=/api/v1`).

## Development Seed Accounts

The Login page (`/login`) has one-click quick-fill buttons for the seed accounts:

| Role | Email | Password |
|------|-------|----------|
| Candidate | `candidate@example.com` | `Candidate123!` |
| Employer | `employer@example.com` | `Employer123!` |
| Admin | `admin@example.com` | `ChangeMe123!` |

## Implemented Flows

1. **Public Job Board & Directory**
   - `/jobs` — Search and filter published jobs by keyword (`q`), category slug, location slug, employment type, workplace type, and career level.
   - `/jobs/:slug` — Job detail with `x-session-id` view tracking, screening questions preview, and internal/external/email apply handling.
   - `/companies` and `/companies/:slug` — Verified company directory and open positions.
   - `/contact` — Support contact form (`POST /api/v1/contact`) with 429 rate-limit handling.
2. **Authentication & Session Management**
   - `/login`, `/register` — JWT login/registration, `GET /api/v1/auth/me` role & company membership resolution, automatic single-flight `POST /api/v1/auth/refresh` on `401`, and `POST /api/v1/auth/logout`.
3. **Candidate Portal** (`candidate` role)
   - `/candidate/profile` — View and update candidate profile (`GET/PATCH /api/v1/candidate/profile`).
   - `/candidate/resumes` — Upload PDF/DOC/DOCX CVs (`POST /api/v1/candidate/resumes`), set default CV, download, or delete.
   - `/jobs/:slug/apply` — Submit internal job applications (`POST /api/v1/jobs/:jobId/applications`) with resume selection, cover letter, and screening answers.
   - `/candidate/applications` — Track application status and withdraw non-terminal applications.
4. **Employer Portal** (`employer` role)
   - `/employer` — Company selector populated from active memberships.
   - `/employer/:companyId/jobs` — Company jobs list with view and application counts.
   - `/employer/:companyId/jobs/:jobId/applications` — Applicant pipeline with status filter, candidate search, status transitions (`PATCH .../status`), screening answer inspection, and authenticated CV download (`GET /api/v1/files/:fileId/download`).
5. **Admin Portal** (`admin` / `moderator` roles)
   - `/admin` — Platform metrics dashboard (`GET /api/v1/admin/dashboard`).
   - `/admin/jobs` — View all or pending jobs, create draft jobs (`POST /api/v1/admin/jobs`), and publish/close jobs (`POST /api/v1/admin/jobs/:id/publish`).
