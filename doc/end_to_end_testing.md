# End-to-End Testing Guide

Manual test plan for the Progress job board (React frontend + NestJS API). Use this after the database is migrated and seeded.

These passwords are **local development seeds only**. Do not use them in production. Change `ADMIN_PASSWORD` before exposing the service.

---

## 1. Prerequisites

1. PostgreSQL is running with database `ethiojobs`.
2. Backend is migrated and seeded:

   ```bash
   cd backend
   npm run prisma:deploy
   npm run prisma:seed
   npm run dev
   ```

3. Frontend is running:

   ```bash
   cd frontend
   npm run dev
   ```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| API | http://localhost:3000/api/v1 |
| Health | http://localhost:3000/api/v1/health |
| Swagger | http://localhost:3000/api/docs |

If port 3000 is busy, the backend may start on 3001+ and write `backend/.dev-server-port`. Vite reads that file and proxies `/api` to the matching port.

Confirm the API is up: `GET /api/v1/health` should return 200.

---

## 2. Test accounts (username + password)

Public registration creates **one user account** with the `candidate` role. That same account can later add an employer profile and switch modes. Seed employer/admin accounts still exist for the existing hiring and admin portals.

| Role | Username (email) | Password | Lands on after login |
|------|------------------|----------|----------------------|
| Admin | `admin@example.com` | `ChangeMe123!` | `/admin` |
| Employer (hiring) | `employer@example.com` | `Employer123!` | `/company` (then auto-opens the employer jobs page) |
| Candidate | `candidate@example.com` | `Candidate123!` | `/jobs` |

Admin email/password can be overridden by `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `backend/.env`. If those are set, use the `.env` values instead of the defaults above.

A `moderator` role exists in the API, but **no moderator user is seeded**.

On `/login`, expand **Demo Test Accounts** to auto-fill any of the three seed logins.

### Seeded company and job

| Item | Value |
|------|--------|
| Company | Demo Technology PLC |
| Company slug | `demo-technology-plc` |
| Verification | `verified` |
| Company membership | `employer@example.com` is **owner** |
| Direct posting | **disabled** by default (`canSelfPublishJobs: false`) — company jobs go to admin review |
| Sample job | Junior Backend Developer |
| Job slug | `junior-backend-developer-demo` |
| Job reference | `DEV-001` |
| Job status | `published` |
| Apply method | `internal` (in-app apply) |
| Location | Addis Ababa |

---

## 3. Recommended test order

Run these in this order so later steps have data (a new job, a CV, and an application):

1. Public browsing (no login)
2. Admin login → dashboard → create and publish a job
3. New register → land on `/jobs` → profile + CV → apply to someone else’s job
4. Same account → **Post a job** → employer setup → submit a vacancy (review flow)
5. Switch back with **Find work** → confirm you cannot apply to your own post
6. Seed employer login → review pipeline → change status
7. Access-control and logout checks

---

## 4. Public flows (no account)

### 4.1 Landing and navigation

1. Open http://localhost:5173
2. Confirm Home, Find Jobs, Companies, Contact, Sign In, and Get Started are visible.
3. Footer links to Home, Jobs, Companies, Contact, Register, and Login work.

**Pass:** Pages load without API errors.

### 4.2 Job board

1. Go to `/jobs`.
2. Confirm **Junior Backend Developer** (Demo Technology PLC) appears.
3. Search `q=backend` and apply filters (category, region, employment type, workplace).
4. Reset filters and confirm the job list returns.
5. Open `/jobs/junior-backend-developer-demo`.

**Pass:** Job detail shows title, company, deadline, and **Sign In to Apply** / **Create account** for guests.

### 4.3 Company directory

1. Go to `/companies`.
2. Confirm **Demo Technology PLC** is listed (verified companies only).
3. Open `/companies/demo-technology-plc`.
4. Confirm the sample job appears under open positions.

**Pass:** Unverified companies never appear in the public directory.

### 4.4 Contact form

1. Go to `/contact`.
2. Submit name, email, subject, and message.

**Pass:** Success state appears. Rapid resubmits may return **429** (rate limited). There is no admin UI to read contact messages; they are stored via `POST /api/v1/contact`.

---

## 5. Account registration (new user)

`/register` creates one account (candidate by default). It does **not** ask the user to pick a role. Hiring is added later from **Post a job**.

1. Open `/register` (or **Get Started**).
2. Fill first name, last name, unique email, optional phone, password (min 8 characters).
3. Submit.

Suggested test user:

| Field | Example |
|-------|---------|
| First name | Tesfa |
| Last name | Lemma |
| Email | `tesfa.lemma@example.com` |
| Phone | `+251911000000` |
| Password | `Tester123!` |

**Pass:** Redirect to `/jobs`. Nav shows Find Jobs, **Post a job**, My Profile, My CVs, and My Applications.

**Fail checks:**

- Reusing `candidate@example.com` shows “already registered”.
- Password shorter than 8 characters is rejected.

### 5.1 Switch to hiring and back

1. While signed in as Tesfa, click **Post a job**.
2. On `/employer/setup`, enter a hiring name (person or business), optional city/contact, and continue.
3. Confirm `POST /auth/enable-employer` is idempotent: visiting setup again skips a second org and opens the job form.
4. Submit a job. Default status is **pending_review** (not on `/jobs` until admin publishes).
5. Click **Find work**. Confirm candidate profile, CVs, and applications are still there.
6. Open the public page for a job Tesfa posted (after admin publishes) and confirm Apply is hidden (“You posted this job”).
7. Apply to **Junior Backend Developer** (or another job Tesfa did not post).

**Pass:** One account holds both roles. Own-job apply is blocked in the UI and by the API (`403`). Repeat **Post a job** does not create a second hiring profile.

Seed `employer@example.com` starts employer-only. **Find work** calls `POST /auth/enable-candidate` and then shows the candidate pages.

---

## 6. Candidate portal (seed or new account)

Login: `candidate@example.com` / `Candidate123!`

### 6.1 Profile

1. Open `/candidate/profile`.
2. Update headline, summary, city, region, years of experience, visibility.
3. Save.

**Pass:** “Profile saved.” Reload keeps the values.

### 6.2 CVs / resumes

1. Open `/candidate/resumes`.
2. Upload a PDF, DOC, or DOCX (max 5 MB). Field name is `file`.
3. Set a default CV.
4. Download it.
5. Optionally upload a second file and delete one.

**Pass:** Default CV is selected automatically on the apply form.

**Fail checks:** Non-document files and files over 5 MB are rejected.

### 6.3 Apply to a job

1. Open `/jobs/junior-backend-developer-demo` (or a job you published in section 7).
2. Click **Submit Application**.
3. Choose a resume, add a cover letter, answer any screening questions.
4. Submit.

**Pass:** Redirect to `/candidate/applications` with status `submitted`. Applying twice to the same job is rejected.

Guests hitting apply are sent to `/login` and should return to `/jobs/:slug/apply` after candidate login.

### 6.4 Application history

1. Open `/candidate/applications`.
2. Confirm job title, company, status, and applied date.
3. On a non-terminal application, click **Withdraw**.

**Pass:** Status becomes `withdrawn`. Withdraw is hidden for `hired`, `rejected`, and `withdrawn`.

---

## 7. Admin portal

Login: `admin@example.com` / `ChangeMe123!`

Nav shows **Dashboard**, **Companies**, **Jobs**, and **Candidates** only (no public Home/Contact links).

### 7.1 Dashboard

1. Open `/admin`.
2. Confirm counts for companies, jobs, published jobs, pending review, registered candidates, and applications.

**Pass:** After seed, companies ≥ 1 and jobs ≥ 1. Counts increase after later steps.

### 7.1b Register and manage companies

1. Open `/admin/companies`.
2. Use **Search companies** to find **Demo Technology PLC** by name or email.
3. Confirm job and member counts, verification badge, and posting toggle (🟢 / ⚪).
4. Click **+ Register company** and complete company profile + **Company login** (email and temporary password only; optional website, logo, office address, HR contact, licence number).
5. Copy credentials from the modal; log out admin and log in as the new employer — confirm `/company` loads.
6. Log back in as admin. Use **✏️ Edit** to change city or industry; set verification if needed.
7. Toggle direct posting (🟢) on for a test company, then off again.

**Pass:** `POST /admin/companies/provision` creates a verified company and owner member. `PATCH` update and posting-access work from the UI.

### 7.1c Terminate and reactivate a company

1. On `/admin/companies`, click **🚫 Terminate** on a non-production test company (not Demo Technology PLC unless you re-seed).
2. Confirm optional reason. Company login for that company should fail with a suspension message.
3. Confirm the company no longer appears on `/companies` (public directory).
4. Click **♻️ Reactivate** on the same row. Employer can log in again; company reappears when verified.

**Pass:** `PATCH /admin/companies/:id/portal-status` suspends member logins and hides the company from the public list until reactivated.

### 7.2 Search, post, publish, and close jobs

1. Open `/admin/jobs`.
2. Use **Search jobs and companies** — try a company name and a job title from the seed.
3. In **Filter job list by company**, confirm job counts; click a row to filter the job list, then **Clear filter**.
4. Click **+ Post new job**.
5. Test **Existing company**: search and click **Demo Technology PLC** in the company picker, then fill job title, **Responsibilities** (category + responsibility description), qualifications, experience, salary (negotiable or range), and deadline. Leave **Publish live immediately** checked or unchecked to test draft vs live.
6. Test **Register new company & post**: fill company + company login + job in one flow; save credentials from the modal.
7. On the job card, use **Publish live** / **Reject** (pending queue), **View public ad**, and **Close vacancy** as needed.

**Pass:** Search hits companies and jobs. Admin can post for existing or newly provisioned companies. Published jobs appear on `/jobs`; closed jobs drop off the open board.

---

## 8. Employer portal (hiring)

Login: `employer@example.com` / `Employer123!`

This is the seeded hiring account. Self-serve users reach the same portal after `/employer/setup`.

### 8.1 Employer home

1. After login, `/company` loads memberships (or redirects to `/company/:companyId/jobs` when there is one company).
2. Confirm **Demo Technology PLC** and the job list (seed job plus any admin-published jobs).
3. Nav includes **Find work** to switch back to seeking jobs.
4. Admin contact appears only when a hiring profile or job was **rejected**, not on first-time pending review.

**Pass:** Applicant counts match applications submitted in section 6.

### 8.2 Post a job (review vs direct)

1. Open **Post opportunity** (`/company/:companyId/jobs/new`).
2. Fill the form and submit.
3. With default settings, status is **pending_review** and the job is **not** on `/jobs` until admin publishes.
4. (Optional) Admin enables **Direct posting** on `/admin/companies`, then repeat — job should become **published** immediately.

**Pass:** Review flow and direct-post flow match company `canSelfPublishJobs`.

### 8.3 Applicant pipeline

1. Click **View candidates** on a **published** job that has applications.
2. Search by candidate name or email.
3. Filter by status.
4. Open an application: screening answers and CV download should work (authenticated).
5. Move status along the allowed path:

   | From | Allowed next |
   |------|----------------|
   | submitted | reviewing, shortlisted, rejected |
   | reviewing | shortlisted, interview, rejected |
   | shortlisted | interview, offered, rejected |
   | interview | offered, rejected |
   | offered | hired, rejected |
   | hired / rejected / withdrawn | none |

**Pass:** Illegal jumps are rejected. Candidate `/candidate/applications` shows the new status after refresh.

Company users can update company profile fields via API (`PATCH /employer/companies/:companyId`). There is no dedicated company-edit screen in the current UI.

---

## 9. Full hiring pipeline (one pass)

Use three browser sessions (or logout/login between roles).

| Step | Actor | Account | Action | Expected |
|------|-------|---------|--------|----------|
| 1 | Admin | `admin@example.com` / `ChangeMe123!` | Create + publish “E2E QA Engineer” | Job visible on `/jobs` |
| 2 | Candidate | `candidate@example.com` / `Candidate123!` | Upload CV if needed, apply | Application `submitted` |
| 3 | Company | `employer@example.com` / `Employer123!` | Open pipeline, set **reviewing** then **shortlisted** | Status updates |
| 4 | Candidate | same | Open My Applications | Status is `shortlisted` |
| 5 | Company | same | Set **interview** → **offered** → **hired** | Terminal; no further moves |
| 6 | Admin | same | Dashboard applications count increased | Metrics updated |

Optional second candidate (`tesfa.lemma@example.com` / `Tester123!`): apply to the same job, then withdraw, and confirm the employer still sees `withdrawn`.

---

## 10. Company onboarding (admin UI or API)

Signed-in users can self-serve a hiring profile with `POST /api/v1/auth/enable-employer` (section 5.1). Admin provision is still available for staff-created employers.

Prefer **`/admin/companies` → Register company** (section 7.1b) when an admin should create the employer, which calls `POST /api/v1/admin/companies/provision` and returns one-time credentials.

For API-only setup (Swagger or curl), use the admin JWT from `POST /api/v1/auth/login`:

1. `POST /api/v1/admin/companies/provision` — company + owner in one step (auto-verified by default), **or** split:
2. `POST /api/v1/admin/companies` — create the company (`name` required; slug is generated).
3. `POST /api/v1/admin/companies/:id/members` — create/link an employer user:

   ```json
   {
     "email": "new.employer@example.com",
     "temporaryPassword": "EmployerNew123!"
   }
   ```

4. If not using provision, `PATCH /api/v1/admin/companies/:id/verification` with `{ "status": "verified" }` so the company appears in `/companies`.
5. Log in as the new company user and confirm `/company` lists the company.

Until verification, the public directory hides the company. Suspended companies are hidden even when verified. `GET /admin/companies` returns all companies for admin search and job posting.

---

## 11. Access control and session

| Action | Expected |
|--------|----------|
| Visit `/candidate/profile` logged out | Redirect to login |
| Visit `/company` as a candidate with no hiring profile | Redirect to `/employer/setup` |
| Visit `/employer/setup` while already a member | Redirect to the job post form |
| Visit `/admin` as employer or candidate | Blocked |
| Old `/employer/...` URLs except `/employer/setup` | Redirect to `/company/...` |
| Member opens apply on their own job | Apply hidden; API returns 403 |
| Logout | Return to `/login`; protected routes fail until login again |
| Wrong password | Error on `/login` |

---

## 12. What is not in the UI yet

These exist on the backend (see [frontend_api_guide.md](./frontend_api_guide.md)) but are **not** end-to-end testable in the current frontend:

- Google / social signup
- Admin featured-company toggle, member-role management, and verification-document workflow UI
- Saved jobs
- In-app notifications inbox
- Forgot / reset password pages
- Moderator seed account
- Interview scheduling UI
- Admin contact-message inbox

Do not treat missing UI as a failed E2E case unless you are testing the API directly.

---

## 13. Quick sign-off checklist

- [ ] Health endpoint returns 200
- [ ] Seed job and Demo Technology PLC appear publicly
- [ ] Contact form submits
- [ ] New user can register, land on `/jobs`, and switch to hiring via **Post a job**
- [ ] Employer setup is idempotent; jobs stay in admin review
- [ ] Same user cannot apply to their own post; can apply to someone else’s job
- [ ] `candidate@example.com` / `Candidate123!` can edit profile, upload CV, apply, withdraw
- [ ] `admin@example.com` / `ChangeMe123!` can manage companies, approve pending jobs, publish, and close jobs
- [ ] `employer@example.com` / `Employer123!` can post jobs (review flow), review applicants, and change status
- [ ] Candidate sees employer status changes
- [ ] Wrong-role URLs are blocked
- [ ] Logout clears the session
