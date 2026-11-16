# KWLCHS Naka — School Management System

Complete School Management System for **Professor Dr. Karl Wilhelm Lauterbach College of Health Sciences and Technology, Naka, Benue State**, Nigeria.

Built with **Next.js 16 (App Router) + TypeScript + Tailwind CSS 4 + shadcn/ui + Prisma (SQLite)**.

---

## What's Included

### 1. Public Landing Page
- Hero with school identity, motto, and "Admissions Open" badge for the current session
- About the College, all 6 programmes (Community Health, Dental Surgery Technology, Environmental Health Technology, Health Information Management, Medical Laboratory Technology, Pharmacy Technology)
- How to Apply (4 steps), Announcements feed, Contact section with WhatsApp link
- Buttons: Apply Online, Check Application Status, Student Portal Login

### 2. Online Admission Application (strictly online)
- 4-step wizard: Personal Details → Programme Choice → O-Level / Exam Details → Review & Submit
- Validates required fields, collects WAEC/NECO/NABTEB/GCE exam details and subject grades
- Auto-generates an application number (`KWLCHS/APP/<year>/NNNN`) shown on a success screen
- Applicants can track status later with just the application number
- Admin reviews applications in the backend: ADMIT / REJECT with note; admitted applicants can be converted into full students with one click (auto matric number `KWLCHS/<year>/<DEPT>/NNN`, default password `student123`)

### 3. Student Portal (login with Matriculation Number + password)
- **Dashboard**: fee balance, CGPA (5.00 scale), courses with results, books on loan, announcements
- **Results**: per-session/semester filters, CA (40) + Exam (60), grade, grade point, GPA & CGPA
- **School Fees**: fee breakdown per level/department, payment history, outstanding balance
- **Timetable**: weekly class schedule for their department & level
- **Library**: their active loans, due dates
- **Profile**: personal details, department, level, status

### 4. Admin Backend (role-based: Provost, Registrar, Bursar)
| Module | What it does | Primary role |
|---|---|---|
| Dashboard | KPIs: students, staff, pending admissions, fees collected/expected/outstanding, students by level, recent payments | All |
| Students | Add/edit/deactivate students, search, filter by dept/level/status, profile with photo, fees & results summary | Registrar |
| Admissions | Review pending applications, admit (creates student record) or reject with note | Registrar |
| Staff | Full staff records (photo, qualifications, rank, specialty, salary, course assignments), attendance register (Present/Absent/Late/Leave) | Registrar |
| Results Upload | Course catalogue management, bulk result entry per course (CA + Exam, auto grade/grade-point), lecturer assignment | Registrar |
| Fees & Payments | Fee structures per session/level/department, record payments (Cash/Transfer/POS), outstanding balances, printable receipts | Bursar |
| Timetable | Weekly timetable grid per department/level/session/semester, day + time + room + lecturer | Registrar |
| Library | Book catalogue, issue & return books to students/staff, track overdue loans | Registrar |
| Communication | Announcements (students/staff/both), WhatsApp message links (wa.me), Email drafts, Fee reminder generator for debtors, full message log | Registrar |
| Users | Manage Provost/Registrar/Bursar accounts (create, reset password, activate/deactivate) | Provost |
| Settings | School name, motto, about, address, contacts, current session/semester, admissions open toggle | Provost |

**Role gating:** Bursar sees fees & dashboard only; Registrar sees academics modules; Provost sees everything incl. Users & Settings.

---

## Demo Login Credentials

> These are seeded demo accounts. **Change all passwords before going live.**

| Portal | Login | Password |
|---|---|---|
| Provost | `provost@kwchs-naka.edu.ng` | `Provost@2025` |
| Registrar | `registrar@kwchs-naka.edu.ng` | `Registrar@2025` |
| Bursar | `bursar@kwchs-naka.edu.ng` | `Bursar@2025` |
| Student 1 | `KWLCHS/2025/DST/001` | `student123` |
| Student 2 | `KWLCHS/2026/CHT/002` | `student123` |
| Student 3 | `KWLCHS/2025/MLT/003` | `student123` |

*(All 20 seeded students use password `student123` — matric numbers follow `KWLCHS/<year>/<DEPT>/<NNN>`.)*

---

## Running Locally

### Prerequisites
- Node.js 20+ or [Bun](https://bun.sh) (recommended)
- No external database needed — SQLite file database is bundled

### Steps (with Bun)
```bash
bun install            # install dependencies
bun run db:push        # create SQLite database from Prisma schema
bunx tsx scripts/seed.ts   # (optional) load demo data
bun run dev            # start dev server on http://localhost:3000
```

### Steps (with npm)
```bash
npm install
npx prisma db push
npx tsx scripts/seed.ts
npm run dev
```

### Environment
`.env` in the project root:
```
DATABASE_URL=file:/full/path/to/db/custom.db
```
Use an absolute path (or `file:./db/custom.db` relative to the prisma folder) on your machine.

### Production
```bash
npm run build
npm start
```

---

## Project Structure

```
prisma/schema.prisma          # Database schema (14 models)
db/custom.db                  # SQLite database (seeded)
scripts/seed.ts               # Demo data seeder
src/
  app/page.tsx                # Single entry route (all portals render here)
  lib/db.ts                   # Prisma client
  lib/auth.ts / session.ts    # Cookie-based sessions (admin + student)
  lib/actions/*.ts            # Server actions: auth, students, staff,
                              # admissions, fees, academics, timetable,
                              # library, communication, users, settings, portal
  components/
    public/public-site.tsx    # Landing page
    public admission wizard   # (inside public-site.tsx)
    shared/login-view.tsx     # Student / Staff-Admin login tabs
    student/student-portal.tsx# Student portal (6 sections)
    admin/admin-panel.tsx     # Admin shell + role-based nav
    admin/admin-*.tsx         # Students, Admissions, Staff, Results, Fees,
                              # Timetable, Library, Communication, Users, Settings
    ui/*                      # shadcn/ui components
```

## Security Notes (before going live)
1. Change every demo password (Users module + student records).
2. Serve over HTTPS; sessions are httpOnly cookies already.
3. Back up `db/custom.db` regularly (it contains all school data).
4. WhatsApp/Email in the Communication module currently generates ready-to-send message links/drafts; connect a provider (e.g. WhatsApp Business API / SMTP) for fully automated delivery.
