<p align="center">
  <img src="https://img.shields.io/badge/Laravel-13.8-FF2D20?logo=laravel&logoColor=white" alt="Laravel 13.8">
  <img src="https://img.shields.io/badge/PHP-%5E8.3-777BB4?logo=php&logoColor=white" alt="PHP 8.3">
  <img src="https://img.shields.io/badge/Inertia.js-3.1-9553E9?logo=inertia&logoColor=white" alt="Inertia.js 3.1">
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black" alt="React 19">
  <img src="https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind CSS 4">
  <img src="https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white" alt="Vite 8">
  <img src="https://img.shields.io/badge/status-active_development-0F6E56" alt="Status">
</p>

<h1 align="center">PMPC WorkForce</h1>
<p align="center"><strong>People's Workforce Management System</strong></p>
<p align="center">A full-featured Human Resource Information System (HRIS) built for<br>
<strong>People's Multi-Purpose Cooperative (PMPC)</strong> — Upi, Gamu, Isabela</p>
<p align="center">Developed by <strong>Jeffrae A. Sapla</strong></p>

---

## About

PMPC WorkForce manages the complete employee lifecycle in one place — from onboarding, to daily
attendance, to semi-monthly payroll, to 13th month pay and printable payslips. It is built as a
single Laravel application serving two distinct portals through one codebase: an **Employee
Portal** for self-service attendance and pay history, and a **Super Admin Portal** for HR and
payroll operations.

The app is a Laravel + Inertia.js + React monolith — no separate API layer, no client-side
routing duplication. Server-rendered data, client-rendered UI, one deploy.

## Portals

| Portal | Route prefix | Accent color | Audience |
|---|---|---|---|
| **Employee Portal** | `/employee/*` | Teal `#0F6E56` | Rank-and-file employees |
| **Super Admin Portal** | `/admin/*` | Deep purple `#26215C` | HR / Payroll administrators |

Both portals share a single login screen. The login accepts either an **Employee ID** (e.g.
`EMP-0042`) or an **email address** — the system detects which was entered — and routes the user
to the correct portal based on their role after authentication.

## Key Features

### 🕒 Daily Time Record (DTR)
- Four punch slots per day — AM In, AM Out, PM In, PM Out — locked in sequence so only the next
  expected punch is active
- Automatic status computation per entry: `on_time`, `late`, `undertime`, `half_day`, `absent`,
  based on configurable shift start/end times and a late grace period
- Employee-submitted **edit requests** for missed or incorrect punches, within a 7-day window,
  routed to the admin for approval/decline with real-time notification back to the employee
- One-click **PDF export** of any employee's DTR for any month, with cooperative letterhead and
  signatory blocks
- **Automated monthly archiving** — on the 1st of each month, a scheduled job generates a DTR PDF
  per active employee, zips them into `storage/app/dtr_archives/YYYY-MM.zip`, and removes the
  loose PDFs

### 👥 Employee Management
- Full employee profile management — personal info, department, position, date hired, status
- Auto-generated sequential Employee IDs (`EMP-0001`, `EMP-0002`, …)
- Per-employee **compensation profile**: daily rate, transportation/representation/quarterly
  allowances, and a full deduction schedule (SSS, PhilHealth, Pag-IBIG, withholding tax, loan,
  capital contribution, cash advance, rental, savings, other)
- Government ID records (SSS, PhilHealth, TIN, Pag-IBIG) tracked separately per employee
- Self-service profile updates, government ID updates, and password changes for employees

### 💰 Payroll Processing
- **Semi-monthly cutoffs** — 1st (1st–15th, full government deductions) and 2nd (16th–end of
  month, government deductions waived, split deductions continue)
- Automatic days-present pull from DTR records for the selected period
- Per-employee **overtime input** — weekday hours (×125%) and weekend/rest-day hours (×130%),
  computed against hourly rate (`daily_rate ÷ 8`)
- Draft → **Finalize** workflow — finalized payrolls are immutable
- Bulk or individual **PDF payslip** generation and download
- Employees can view and download their own payslip history at any time

### 🎁 13th Month Pay
- Computed per **RA 6686 / PD 851** in two tranches: Mid-year (Jan 1 – Jun 30, released June) and
  Year-end (Jul 1 – Dec 31, released December)
- Formula: `(daily_rate × total DTR days present in period) ÷ 12` — fully pro-rated on actual
  attendance, not assumed working days
- Draft → Finalize workflow mirroring payroll

### 📊 Payroll Analytics
- Chart-driven dashboard (Recharts) surfacing payroll cost trends, gross-vs-deductions
  breakdowns, and other cooperative-wide KPIs for administrators

### ✅ Task Planner
- Lightweight personal calendar/task manager per employee — title, description, due date,
  category, priority, and completion status

### 🔔 Real-Time Notifications
- In-app notification center with unread badge counts
- Delivered instantly via **Pusher** WebSocket broadcasting — no polling, no page refresh —
  triggered on DTR edit-request approval/decline

### ⚙️ System Settings
Centralized, cached key-value configuration covering:
- Cooperative info (name, address, email, phone) — appears on every DTR print and payslip
- Shift & attendance rules (shift start/end, lunch window, late grace period)
- Payroll defaults (working days per month)
- The two signing officials (name + role) printed on DTR exports and payslips

## Roles & Permissions

| Capability | Employee | Super Admin |
|---|:---:|:---:|
| Clock in / out, view own DTR | ✅ | ✅ |
| Submit DTR edit requests | ✅ | ✅ |
| View/print own DTR, view own payslips | ✅ | ✅ |
| Manage own profile, government IDs, password | ✅ | ✅ |
| Personal task planner | ✅ | ✅ |
| Create / edit / deactivate employees | — | ✅ |
| Set employee compensation & deductions | — | ✅ |
| View all employees' DTR, print any DTR | — | ✅ |
| Approve / decline DTR edit requests | — | ✅ |
| Process, save, finalize payroll | — | ✅ |
| Process, finalize 13th month pay | — | ✅ |
| Download individual / bulk payslips | — | ✅ |
| View payroll analytics | — | ✅ |
| Manage system settings | — | ✅ |

## Tech Stack

| Layer | Technology |
|---|---|
| Backend framework | Laravel `^13.8` (PHP `^8.3`) |
| Frontend/backend bridge | Inertia.js `^3.1` (`inertiajs/inertia-laravel` + `@inertiajs/react`) |
| UI | React `19`, Tailwind CSS `^4.3` (via `@tailwindcss/vite`) |
| Build tool | Vite `^8` with `@vitejs/plugin-react` |
| Charts | Recharts `^3.9` |
| PDF generation | `barryvdh/laravel-dompdf` `^3.1` (payslips + DTR exports) |
| Real-time | Pusher (`pusher/pusher-php-server` + `laravel-echo` + `pusher-js`) |
| Database | MySQL (local dev commonly via XAMPP) |
| Task scheduling | Laravel Scheduler (`php artisan schedule:run`) |

## System Architecture

```
Browser (React 19 + Inertia)
        │  Inertia XHR/visits (JSON, not a REST API)
        ▼
Laravel 13 (routes/web.php)
 ├─ auth + role:employee|super_admin middleware
 ├─ Controllers (app/Http/Controllers/**)
 ├─ Eloquent Models (app/Models/**)
 └─ Blade PDF templates (resources/views/**) ── DomPDF ──▶ payslip / DTR PDFs
        │
        ▼
MySQL ── employees, dtr_logs, dtr_edit_requests, payrolls, payroll_items,
         thirteenth_month_pays, tasks, notifications, settings, sessions,
         cache, jobs, employee_government_ids
        │
        └─ NotificationSent event ──▶ Pusher ──▶ Echo (browser) ──▶ toast + badge
```

### Directory layout

```
app/
├── Console/Commands/ArchiveDtrCommand.php     # `php artisan dtr:archive`
├── Http/Controllers/
│   ├── Admin/                                 # Super Admin portal controllers
│   └── *.php                                  # Shared/employee controllers
├── Http/Middleware/EnsureRole.php             # role:employee / role:super_admin guard
└── Models/                                    # Employee, DtrLog, Payroll, PayrollItem,
                                                # ThirteenthMonthPay, Setting, Task, ...
resources/
├── js/Pages/Admin/         # Dashboard, Employees, Payroll, PayrollAnalytics,
│                           # ThirteenthMonth, DTR, EditRequests, Settings
├── js/Pages/Employee/      # Dashboard, DTR, Payslips, Planner, Profile, Notifications
├── js/Layouts/ · js/Components/ · js/hooks/
└── views/                  # Blade templates for DomPDF (payslips, DTR prints)
database/migrations/        # employees, dtr_logs, payrolls, payroll_items,
                             # thirteenth_month_pays, settings, notifications, ...
routes/
├── web.php                 # guest / employee / admin route groups
└── console.php             # dtr:archive scheduled monthly on the 1st
```

## Payroll Computation Reference

**Basic pay**
```
monthly_basic  = daily_rate × working_days_per_month   (default: 22)
cutoff_basic   = monthly_basic ÷ 2
```
> Basic pay is fixed regardless of days present. Days present affects the DTR/payslip display
> and 13th-month computation only — not the basic pay itself.

**Allowances** — transportation, representation, and quarterly allowances are each halved per
cutoff (`monthly_amount ÷ 2`).

**Overtime**
```
hourly_rate  = daily_rate ÷ 8
weekday_OT   = hourly_rate × 1.25 × weekday_OT_hours
weekend_OT   = hourly_rate × 1.30 × weekend_OT_hours
```

**Gross pay**
```
gross = cutoff_basic + cutoff_transpo + cutoff_rep + cutoff_quarterly + weekday_OT + weekend_OT
```

**Deduction schedule**

| Deduction | 1st cutoff (1–15) | 2nd cutoff (16–end) |
|---|---|---|
| SSS, PhilHealth, Pag-IBIG, Withholding Tax | Full amount | — |
| Loan, Capital contribution, Cash advance, Rental, Savings, Other | Amount ÷ 2 | Amount ÷ 2 |

```
net_pay = gross_pay − total_deductions
```

**13th month pay** (RA 6686 / PD 851)
```
total_basic_pay (period) = daily_rate × total_DTR_days_present_in_period
13th_month_pay            = total_basic_pay ÷ 12
```
Mid-year tranche covers Jan 1 – Jun 30 (released June); Year-end tranche covers Jul 1 – Dec 31
(released December). Pro-ration is automatic, based on actual attendance.

## Getting Started

### Requirements

| Requirement | Version |
|---|---|
| PHP | `^8.3`, with `pdo`, `pdo_mysql`, `openssl`, `mbstring`, `tokenizer`, `xml`, `ctype`, `fileinfo`, `zip`, and `gd` or `imagick` |
| MySQL | `8.0+` |
| Composer | `2.x` |
| Node.js | `18.x+` |
| npm | `9.x+` |

### Installation

```bash
git clone https://github.com/aokisan0924/pmpc-mngnt-system.git
cd pmpc-mngnt-system

composer install
npm install

cp .env.example .env
php artisan key:generate
```

Configure your database in `.env`, then:

```bash
php artisan migrate --seed
php artisan install:broadcasting   # decline Reverb + Node deps if already installed
```

Run the app (two processes, or use the bundled `composer dev` script which runs the server,
queue listener, log tailer, and Vite together):

```bash
composer dev
```

…or manually in two terminals:

```bash
php artisan serve      # http://localhost:8000
npm run dev            # Vite dev server
```

### Environment variables of note

```env
BROADCAST_CONNECTION=pusher
PUSHER_APP_ID=
PUSHER_APP_KEY=
PUSHER_APP_SECRET=
PUSHER_APP_CLUSTER=ap1

VITE_PUSHER_APP_KEY="${PUSHER_APP_KEY}"
VITE_PUSHER_APP_CLUSTER="${PUSHER_APP_CLUSTER}"

SESSION_DRIVER=database
SESSION_LIFETIME=480
```

### Useful Artisan commands

```bash
php artisan dtr:archive --month=2026-06   # manually trigger a monthly DTR archive
php artisan optimize:clear                # clear all caches
php artisan migrate:status                # check migration state
php artisan schedule:list                 # verify the archive job is registered
```

## Scheduled Jobs

| Job | Schedule | Defined in |
|---|---|---|
| `dtr:archive` | Monthly, 1st @ 00:00 (archives the previous month) | `routes/console.php` |

In production, point your OS scheduler (cron, or Windows Task Scheduler for XAMPP deployments)
at `php artisan schedule:run` once per minute.

## Database Overview

| Table | Purpose |
|---|---|
| `employees` | Core user table for both employees and admins, including compensation fields |
| `employee_government_ids` | SSS, PhilHealth, TIN, Pag-IBIG numbers per employee |
| `dtr_logs` | Daily attendance — AM/PM in/out, computed hours, status |
| `dtr_edit_requests` | Employee-submitted time corrections with admin review trail |
| `payrolls` | Payroll batch headers — period, cutoff, status, totals |
| `payroll_items` | Per-employee payroll line detail — earnings, deductions, net |
| `thirteenth_month_pays` | 13th month pay records, per tranche |
| `tasks` | Personal task planner entries |
| `notifications` | In-app notification records |
| `settings` | Cached key-value system configuration |

## Security Notes

- Passwords are hashed (`bcrypt`, `BCRYPT_ROUNDS=12`).
- Role-based access is enforced server-side via the `role:employee|super_admin` middleware alias
  — not just hidden in the UI.
- **Before deploying publicly:** rotate the credentials created by `DatabaseSeeder`, move any
  seeded personal emails/passwords out of version control, and never commit a populated `.env`.

## Author

Developed by **Jeffrae A. Sapla**.

## License

Internal system built for People's Multi-Purpose Cooperative. Not licensed for redistribution.