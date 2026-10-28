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
| Apply method | `admin` (hire through Progress at `progressjobs8@gmail.com`) |
| Location | Addis Ababa |

---

## 3. Recommended test order

Run these in this order so later steps have data (a new job and a hiring profile):

1. Public browsing (no login) — job detail shows **How to apply** contact, not in-app apply
2. Admin login → dashboard → create and publish a job (choose how to hire)
3. New register → land on `/jobs` → profile + CV
4. Same account → **Post a job** / **Switch to hiring** next to the profile → employer setup → submit a vacancy with how-to-hire (review flow)
5. Switch back with **Switch to finding work** → confirm your own post shows “You posted this job”
6. Seed employer login → postings list has **Edit post**, not View candidates
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

### 4.3 Public company directory

The public company directory is retired so job-seekers follow jobs, not companies.

1. Go to `/companies` or `/companies/demo-technology-plc`.
2. Confirm both URLs redirect to `/jobs`.
3. On a job card, confirm the employer name is plain text (not a link).

**Pass:** Header/footer have no Companies link. Admin still manages companies at `/admin/companies`.

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

**Pass:** Redirect to `/jobs`. Nav shows Find Jobs, Contact, **Post a job**, and **Create profile** next to the account pill.

**Fail checks:**

- Reusing `candidate@example.com` shows “already registered”.
- Password shorter than 8 characters is rejected.

### 5.1 Switch to hiring and back

1. While signed in as Tesfa, click **Post a job** next to the profile (switches this account to hiring).
2. On `/employer/setup`, enter a hiring name (person or business), optional city/contact, and continue.
3. Confirm `POST /auth/enable-employer` is idempotent: visiting setup again skips a second org and opens the job form.
4. Submit a job. Default status is **pending_review** (not on `/jobs` until admin publishes).
5. Click **Switch to finding work** next to the profile. Confirm **Create profile** is next to the account pill and `/candidate/profile` still loads.
6. Open the public page for a job Tesfa posted (after admin publishes) and confirm it shows “You posted this job” with **Switch to hiring and edit**.
7. Open **Junior Backend Developer** (or another job Tesfa did not post) and confirm **How to apply** shows Progress contact (`progressjobs8@gmail.com`).

**Pass:** One account holds both roles. Repeat **Post a job** / **Switch to hiring** does not create a second hiring profile.

Seed `employer@example.com` starts employer-only. **Switch to finding work** calls `POST /auth/enable-candidate` and then shows the candidate pages.

---

## 6. Candidate portal (seed or new account)

Login: `candidate@example.com` / `Candidate123!`

### 6.1 Profile builder

1. Click **Create profile** next to the account pill (or open `/candidate/profile`).
2. Confirm the page has identity, summary, experience, education, certifications, skills, languages, profile strength, and CV.
3. Use **Edit profile** to change name/location, then add a summary, a skill, and a language.
4. `/candidate/resumes` and `/candidate/applications` redirect here.

**Pass:** Reload keeps the values. Header does not show My Profile, My CVs, or My Applications.

### 6.2 CV upload

1. On `/candidate/profile`, upload a PDF, DOC, or DOCX (max 5 MB) in **Your curriculum vitae**.
2. Confirm View / Change / Download work for the active file.

**Pass:** Upload succeeds and the file name appears on the CV card.

**Fail checks:** Non-document files and files over 5 MB are rejected.

### 6.3 How to apply on a public job

1. Open `/jobs/junior-backend-developer-demo` (or a job you published in section 7).
2. Confirm the sidebar is **How to apply**, not **Submit Application**.
3. For the seed job (hire through Progress), the contact email is `progressjobs8@gmail.com`.
4. `/jobs/:slug/apply` redirects to `/jobs/:slug`.
5. `POST /api/v1/jobs/:jobId/applications` is rejected (use the posted contact instead).

**Pass:** Candidates contact the listed email or follow the how-to-hire note. There is no in-app apply form.

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
3. Confirm the company is hidden from the public job board while suspended.
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
3. Next to the profile, **Switch to finding work** returns to seeking jobs.
4. From the public site, **Switch to hiring** next to the profile opens the employer portal.
5. Admin contact appears only when a hiring profile or job was **rejected**, not on first-time pending review.

**Pass:** Jobs show **Edit post**. There is no **View live**, **View candidates**, or applicant count.

### 8.2 Post a job (review vs direct)

1. Open **Post opportunity** (`/company/:companyId/jobs/new`).
2. Fill the form, including required **How to hire**:
   - **Contact the company** — email and/or how-to-hire note, or
   - **Hire through Progress (admin)** — no employer email; candidates see `progressjobs8@gmail.com`.
3. Submit.
4. With default settings, status is **pending_review** and the job is **not** on `/jobs` until admin publishes.
5. After publish, the public job shows the contact chosen above.
6. (Optional) Admin enables **Direct posting** on `/admin/companies`, then repeat — job should become **published** immediately.

**Pass:** Review flow and direct-post flow match company `canSelfPublishJobs`. Submit is rejected if how-to-hire is missing, or if company contact has neither email nor instructions.

### 8.3 Edit a posted job

1. Click **Edit post** on a submitted or published job (`/company/:companyId/jobs/:jobId/edit`).
2. Change description, how-to-hire, salary, title, role/category, or deadline and save.
3. Confirm **Save changes** is the last action at the bottom of the form.
4. Reload the edit page and confirm the new deadline and other fields persisted. No admin approval is required.

**Pass:** Employers can update every listing field, including deadline and category, in one save.

Company users can update company profile fields via API (`PATCH /employer/companies/:companyId`). There is no dedicated company-edit screen in the current UI.

---

## 9. Hire-by-contact (one pass)

Use two browser sessions (or logout/login between roles).

| Step | Actor | Account | Action | Expected |
|------|-------|---------|--------|----------|
| 1 | Admin | `admin@example.com` / `ChangeMe123!` | Create + publish a job with **Hire through Progress** | Job visible on `/jobs`; how to apply shows `progressjobs8@gmail.com` |
| 2 | Company | `employer@example.com` / `Employer123!` | Post a job with **Contact the company** (email or note) | After publish, public job shows that contact |
| 3 | Guest / candidate | none required | Open both jobs | Contact is visible; no Submit Application |
| 4 | Company | same | Open employer job list | **Edit post**; no View live or View candidates |

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

4. If not using provision, `PATCH /api/v1/admin/companies/:id/verification` with `{ "status": "verified" }` so the company’s jobs can appear on `/jobs`.
5. Log in as the new company user and confirm `/company` lists the company.

Until verification, the company’s jobs stay off the public job board. Suspended companies are hidden even when verified. `GET /admin/companies` returns all companies for admin search and job posting. The public `/companies` directory redirects to `/jobs`.

---

## 11. Access control and session

| Action | Expected |
|--------|----------|
| Visit `/candidate/profile` logged out | Redirect to login |
| Visit `/company` as a candidate with no hiring profile | Redirect to `/employer/setup` |
| Visit `/employer/setup` while already a member | Redirect to the job post form |
| Visit `/admin` as employer or candidate | Blocked |
| Old `/employer/...` URLs except `/employer/setup` | Redirect to `/company/...` |
| Member opens their own job | “You posted this job”; manage link if employer |
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
- [ ] Own job shows “You posted this job”; other jobs show how-to-apply contact
- [ ] `candidate@example.com` / `Candidate123!` can edit profile and upload a CV
- [ ] `admin@example.com` / `ChangeMe123!` can manage companies, approve pending jobs, publish, and close jobs
- [ ] `employer@example.com` / `Employer123!` can post jobs (review flow) with how-to-hire; no View candidates inbox
- [ ] Wrong-role URLs are blocked
- [ ] Logout clears the session
