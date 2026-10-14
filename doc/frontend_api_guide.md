# Frontend API Guide — Ethiojobs-style Backend

This document is for frontend developers building the **public site**, **candidate portal**, **employer (company) dashboard**, and **admin panel** against the NestJS API.

**Interactive docs:** when the backend is running, open [http://localhost:3000/api/docs](http://localhost:3000/api/docs) (Swagger).

---

## 1. Base configuration

| Item | Value |
|------|--------|
| Base URL (local) | `http://localhost:3000` |
| API prefix | `/api/v1` |
| Full API base | `http://localhost:3000/api/v1` |
| Content-Type | `application/json` (except file uploads) |
| CORS | Enabled on the backend |

### Health check

```http
GET /api/v1/health
```

Response:

```json
{ "status": "ok", "timestamp": "2026-10-14T12:00:00.000Z" }
```

---

## 2. Authentication

### 2.1 Register (candidate only)

Employer accounts are created by an **admin**, not via public register.

```http
POST /api/v1/auth/register
```

Body:

```json
{
  "email": "user@example.com",
  "password": "minimum8chars",
  "firstName": "Abebe",
  "lastName": "Kebede",
  "phone": "+251911000000"
}
```

`phone` is optional.

### 2.2 Login

`identifier` is **email or phone** (email is matched case-insensitively).

```http
POST /api/v1/auth/login
```

Body:

```json
{
  "identifier": "user@example.com",
  "password": "minimum8chars"
}
```

### 2.3 Token response (register, login, refresh)

```json
{
  "accessToken": "<JWT>",
  "refreshToken": "<JWT>",
  "expiresAt": "2026-11-13T12:00:00.000Z"
}
```

- Send the access token on protected routes:  
  `Authorization: Bearer <accessToken>`
- Store `refreshToken` securely (httpOnly cookie or secure storage).
- Access token lifetime defaults to **15 minutes** (configurable on server).

### 2.4 Refresh session

```http
POST /api/v1/auth/refresh
```

Body:

```json
{ "refreshToken": "<refreshToken>" }
```

Returns a new access + refresh pair (refresh token is rotated).

### 2.5 Logout

```http
POST /api/v1/auth/logout
```

Body:

```json
{ "refreshToken": "<refreshToken>" }
```

Response: **204 No Content**.

### 2.6 Current user

```http
GET /api/v1/auth/me
Authorization: Bearer <accessToken>
```

Includes `roles` (e.g. `candidate`, `employer`, `admin`, `moderator`), optional `candidateProfile`, and active `companyMemberships` for employers.

### 2.7 Password reset

```http
POST /api/v1/auth/forgot-password
{ "email": "user@example.com" }
```

```http
POST /api/v1/auth/reset-password
{ "token": "<token from email>", "password": "newpassword8" }
```

Response: **204** on success.

### 2.8 Rate limits (auth)

Login, register, forgot-password, and contact forms are throttled (~5 requests/minute per IP). Handle **429** with a user-friendly message.

---

## 3. Roles and frontend apps

| Role | Typical UI |
|------|------------|
| *(none)* | Public job search, company directory, job detail, contact |
| `candidate` | Profile, CVs, apply, saved jobs, my applications, notifications |
| `employer` | Company profile, view jobs, applicant pipeline, interviews |
| `admin` / `moderator` | Companies, post/publish jobs, users, reports, dashboard |

A user can have **multiple roles** (check `auth/me`).

**Employer scope:** almost all employer routes require `companyId` in the path. Use `auth/me` → `companyMemberships` to pick the active company. The backend checks **active membership**; never trust `companyId` from the client alone without the user being a member.

---

## 4. Error handling

NestJS validation and HTTP errors typically look like:

```json
{
  "statusCode": 400,
  "message": ["field must be a string"],
  "error": "Bad Request"
}
```

Or a single string in `message` for business rules.

Common codes:

| Code | Meaning |
|------|---------|
| 401 | Missing/invalid token |
| 403 | Wrong role or not a company member |
| 404 | Resource not found |
| 409 | Conflict (e.g. duplicate job application) |
| 422 | Job not open for apply (expired, not published, external apply only) |
| 429 | Too many requests |

---

## 5. Enums (use exact strings in JSON)

### Employment type (`employmentType`)

`full_time` | `part_time` | `contract` | `internship` | `temporary` | `volunteer`

### Workplace type (`workplaceType`)

`on_site` | `hybrid` | `remote`

### Application method (`applicationMethod`)

`internal` | `external_url` | `email`

- **`internal`:** candidate applies via `POST /jobs/:jobId/applications`.
- **`external_url` / `email`:** show link or email on job detail; no in-app apply.

### Application status (`status`)

`submitted` → `reviewing` → `shortlisted` → `interview` → `offered` → `hired`  
Also: `rejected`, `withdrawn` (candidate only, from non-terminal states).

### Job status (admin; public only sees `published`)

`draft` | `pending_review` | `published` | `rejected` | `closed` | `archived`

### Company member role

`owner` | `recruiter` | `hiring_manager`

### Verification status

`pending` | `verified` | `rejected`

### File upload category (`:category` in upload URL)

`cv` | `logo` | `profile_image` | `document`

### Screening question type

`text` | `number` | `yes_no` | `single_choice` | `multiple_choice`

For choice types, admin sets `options` as a JSON array on the question.

### Profile visibility (candidate)

`public` | `employers` | `private`

---

## 6. Public endpoints (no auth)

### Taxonomy (filters for search UI)

| Method | Path | Notes |
|--------|------|--------|
| GET | `/categories` | Job categories (nested `children` possible) |
| GET | `/industries` | Industries |
| GET | `/locations` | Locations (country, region, city, slug) |
| GET | `/skills?q=` | Skill autocomplete; max ~50 results |

### Jobs

| Method | Path | Notes |
|--------|------|--------|
| GET | `/jobs` | Paginated published jobs |
| GET | `/jobs/:slug` | Job detail by **slug** (not UUID) |

**Query params for `GET /jobs`:**

| Param | Type | Description |
|-------|------|-------------|
| `q` | string | Full-text search |
| `category` | string | Category **slug** |
| `location` | string | Location **slug** |
| `company` | string | Company **slug** |
| `employment_type` | enum | See employment type |
| `career_level` | string | e.g. `entry`, `senior` |
| `workplace_type` | enum | See workplace type |
| `page` | number | Default 1 |
| `limit` | number | Default 20, max 100 |

**Response shape:**

```json
{
  "data": [ /* job objects with company, category, location */ ],
  "page": 1,
  "limit": 20,
  "total": 42
}
```

Only jobs with `status: published` and deadline **≥ today** appear.

**Job detail — optional headers (analytics):**

```http
GET /api/v1/jobs/senior-accountant-acme
x-session-id: <anonymous-session-uuid>
x-view-source: search
```

Deduped view counting per session per 24h.

Detail includes `screeningQuestions` (for apply form), `skills`, company, etc.

### Companies

| Method | Path | Notes |
|--------|------|--------|
| GET | `/companies` | Verified companies; `page`, `limit` |
| GET | `/companies/:slug` | Profile + open published jobs |

### Support

| Method | Path | Body |
|--------|------|------|
| POST | `/contact` | `{ name, email, subject, message }` |
| POST | `/job-reports` | `{ jobId, reason, description? }` |

---

## 7. Candidate endpoints

**Required:** `Authorization: Bearer …` and role **`candidate`**.

### Profile

| Method | Path |
|--------|------|
| GET | `/candidate/profile` |
| PATCH | `/candidate/profile` |

PATCH body (all optional): `headline`, `summary`, `dateOfBirth`, `gender`, `country`, `region`, `city`, `address`, `yearsExperience`, `currentSalary`, `salaryCurrency`, `expectedSalary`, `availabilityStatus`, `profileVisibility`.

### Education & experience

| Method | Path |
|--------|------|
| POST | `/candidate/educations` |
| PATCH | `/candidate/educations/:id` |
| DELETE | `/candidate/educations/:id` |
| POST | `/candidate/experiences` |
| PATCH | `/candidate/experiences/:id` |
| DELETE | `/candidate/experiences/:id` |

### Skills

| Method | Path | Body |
|--------|------|------|
| PUT | `/candidate/skills` | `{ "skills": [{ "skillId", "proficiencyLevel?", "yearsExperience?" }] }` |

Replaces the full skill set.

### CVs / resumes

| Method | Path | Notes |
|--------|------|--------|
| GET | `/candidate/resumes` | List with file metadata |
| POST | `/candidate/resumes` | `multipart/form-data`: field `file`, body field `title` |
| PATCH | `/candidate/resumes/:id/default` | Set default CV |
| DELETE | `/candidate/resumes/:id` | Fails if CV used on an application |

Allowed CV types: PDF, DOC, DOCX (max **5 MB**).

Alternative upload flow:

1. `POST /files/upload/cv` with multipart `file` (authenticated).
2. Register resume with file id if you extend API; current flow uploads in one step on `/candidate/resumes`.

### Apply to a job

Use job **UUID** from detail (`id` field), not slug.

```http
POST /api/v1/jobs/:jobId/applications
Authorization: Bearer <token>
```

Body:

```json
{
  "resumeId": "uuid-optional-if-you-have-default",
  "coverLetter": "optional text",
  "answers": [
    { "questionId": "uuid", "answerText": "Yes, 5 years" }
  ]
}
```

- All **required** screening questions must have answers.
- **409** if already applied.
- **422** if job closed, expired, or not `internal` apply.

### My applications

| Method | Path |
|--------|------|
| GET | `/candidate/applications` |
| GET | `/candidate/applications/:id` |
| POST | `/candidate/applications/:id/withdraw` |

### Saved jobs

| Method | Path |
|--------|------|
| GET | `/candidate/saved-jobs` |
| POST | `/candidate/saved-jobs/:jobId` |
| DELETE | `/candidate/saved-jobs/:jobId` |

---

## 8. Employer endpoints

**Required:** role **`employer`** + **`CompanyMemberGuard`** (`companyId` in path).

Base pattern: `/employer/companies/:companyId/...`

### Company

| Method | Path | Notes |
|--------|------|--------|
| GET | `/employer/companies` | All companies the user belongs to |
| GET | `/employer/companies/:companyId` | Detail + active members |
| PATCH | `/employer/companies/:companyId` | Description, contacts, logo, etc. (not name/verification) |

PATCH body: same fields as admin company update, partial allowed (`UpdateCompanyDto`).

### Jobs (read-only for employers today)

| Method | Path |
|--------|------|
| GET | `/employer/companies/:companyId/jobs` |
| GET | `/employer/companies/:companyId/jobs/:jobId/stats` |

Stats: `{ views, applications: [{ status, _count }] }`.

Jobs are **created and published by admin** in the current product scope.

### Applicants

| Method | Path | Query |
|--------|------|--------|
| GET | `/employer/companies/:companyId/jobs/:jobId/applications` | `status`, `search` |
| GET | `/employer/companies/:companyId/applications/:id` | Full applicant + answers + resume |
| PATCH | `/employer/companies/:companyId/applications/:id/status` | Body: `{ status, note? }` |
| POST | `/employer/companies/:companyId/applications/:id/interviews` | Schedule interview |
| PATCH | `/employer/companies/:companyId/interviews/:id` | Update interview |

**Download CV:** use `resume.file.id` from application detail →  
`GET /api/v1/files/:fileId/download` with employer token (membership checked server-side).

---

## 9. Admin / moderator endpoints

**Required:** role **`admin`** or **`moderator`**.

### Dashboard & users

| Method | Path |
|--------|------|
| GET | `/admin/dashboard` |
| GET | `/admin/users` |
| PATCH | `/admin/users/:id/status` | `{ "status": "active" \| "pending" \| "suspended" }` |

Dashboard counts: companies, jobs, candidates, applications, pendingReports.

### Companies

| Method | Path |
|--------|------|
| GET | `/admin/companies` |
| POST | `/admin/companies` |
| PATCH | `/admin/companies/:id` |
| POST | `/admin/companies/:id/members` | Create employer user + membership |
| PATCH | `/admin/members/:id` | `{ memberRole?, status? }` |
| PATCH | `/admin/companies/:id/verification` | `{ "status": "pending" \| "verified" \| "rejected" }` |
| PATCH | `/admin/companies/:id/featured?value=true` | Featured flag |

**Create employer member** body:

```json
{
  "email": "hr@company.com",
  "firstName": "HR",
  "lastName": "User",
  "temporaryPassword": "TempPass123!",
  "memberRole": "owner"
}
```

### Jobs (admin posting flow)

| Method | Path |
|--------|------|
| GET | `/admin/jobs` |
| GET | `/admin/jobs/pending` | `pending_review` only |
| POST | `/admin/jobs` |
| PATCH | `/admin/jobs/:id` |
| POST | `/admin/jobs/:id/publish` | Sets published + postedAt |
| POST | `/admin/jobs/:id/close` |
| POST | `/admin/jobs/:id/archive` |
| PUT | `/admin/jobs/:id/screening-questions` | `{ "questions": [...] }` |
| PUT | `/admin/jobs/:id/skills` | `{ "skills": [{ "skillId", "isRequired?" }] }` |

**Create job** (minimal example):

```json
{
  "companyId": "uuid",
  "categoryId": "uuid",
  "locationId": "uuid",
  "title": "Junior Accountant",
  "description": "Full description HTML or plain text",
  "employmentType": "full_time",
  "workplaceType": "on_site",
  "applicationMethod": "internal",
  "applicationDeadline": "2026-12-31",
  "vacanciesCount": 1
}
```

Then `POST .../publish` when ready for the public site.

### Taxonomy (admin)

| Method | Path |
|--------|------|
| POST | `/admin/categories` |
| PUT | `/admin/categories/:id` |
| POST | `/admin/industries` |
| POST | `/admin/locations` |
| POST | `/admin/skills` |
| DELETE | `/admin/:kind/:id` | `kind`: `categories` \| `industries` \| `locations` \| `skills` |

### Moderation & audit

| Method | Path |
|--------|------|
| GET | `/admin/reports` |
| PATCH | `/admin/reports/:id` | `{ "status": "pending" \| "reviewing" \| "resolved" \| "dismissed" }` |
| GET | `/admin/contact-messages` |
| PATCH | `/admin/contact-messages/:id` | `{ status, assignedTo? }` |
| GET | `/admin/audit-logs` |

---

## 10. Notifications (any authenticated user)

| Method | Path |
|--------|------|
| GET | `/notifications` |
| PATCH | `/notifications/:id/read` |
| GET | `/notifications/preferences/all` |
| PUT | `/notifications/preferences` | `{ notificationType, emailEnabled?, smsEnabled?, inAppEnabled? }` |

Types include e.g. `application_update`, `new_application`, `system`.

---

## 11. Files

| Method | Path | Auth |
|--------|------|------|
| POST | `/files/upload/:category` | Yes — multipart `file` |
| GET | `/files/:id/public` | No — only non-private (e.g. logos) |
| GET | `/files/:id/download` | Yes — CVs private; owner, admin, or employer viewing applicant |
| DELETE | `/files/:id` | Owner or admin |

---

## 12. Suggested frontend flows

### Public job board

1. `GET /categories`, `GET /locations` → build filter UI (use **slugs** in job search query).
2. `GET /jobs?...` → list cards.
3. `GET /jobs/:slug` → detail; if `applicationMethod !== internal`, show external apply UI.
4. If internal apply → redirect to login/register → apply flow.

### Candidate registration & apply

1. `POST /auth/register` → store tokens.
2. `POST /candidate/resumes` (or upload CV first).
3. `POST /jobs/:jobId/applications` with screening `answers`.
4. `GET /candidate/applications` for history.

### Employer dashboard

1. `GET /auth/me` → pick `companyId` from `companyMemberships`.
2. `GET /employer/companies/:companyId/jobs` → job list.
3. `GET .../jobs/:jobId/applications?status=submitted` → pipeline.
4. `PATCH .../applications/:id/status` → move candidate; candidate gets notification.
5. `GET /files/:id/download` for CV.

### Admin — post a job for a company

1. `POST /admin/companies` (if new).
2. `POST /admin/companies/:id/members` (employer login).
3. `POST /admin/jobs` → draft.
4. `PUT .../screening-questions`, `PUT .../skills` as needed.
5. `POST /admin/jobs/:id/publish` → visible on public `GET /jobs`.

---

## 13. Local development credentials (seed)

After `npm run prisma:seed` in `backend/`:

| Role | Email | Password |
|------|--------|----------|
| Admin | `admin@example.com` (or `ADMIN_EMAIL` in `.env`) | `ChangeMe123!` (or `ADMIN_PASSWORD`) |
| Employer | `employer@example.com` | `Employer123!` |
| Candidate | `candidate@example.com` | `Candidate123!` |

Use **`POST /auth/login`** then **`GET /auth/me`** to confirm roles before wiring routes in the UI.

---

## 14. Frontend checklist

- [ ] Axios/fetch base URL `http://localhost:3000/api/v1`
- [ ] Attach `Authorization` on protected routes
- [ ] Refresh token flow before access token expires
- [ ] Handle 401 → login redirect
- [ ] Job list filters use taxonomy **slugs**
- [ ] Job detail URL uses **slug**; apply uses job **id**
- [ ] Employer routes always include correct **`companyId`**
- [ ] Multipart uploads for CVs (field name `file`)
- [ ] Optional `x-session-id` on job detail for analytics

For schema details and business rules, see [ethiojobs_style_backend_architecture.md](./ethiojobs_style_backend_architecture.md).
