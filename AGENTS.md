# Antigravity Project Instructions for PMPC WorkForce

Welcome to the **PMPC WorkForce** (People's Workforce Management System) repository. Follow these rules and standards on every coding task to maintain exceptional quality, performance, and security.

---

## 1. Project Tech Stack & Architecture

- **Backend**: Laravel 13.x, PHP 8.3+, Eloquent ORM, Barryvdh DomPDF, Pusher broadcasting.
- **Frontend**: React 19, Inertia.js 3.x, Tailwind CSS 4, Vite 8, Recharts.
- **Portals**:
  - **Employee Portal (`/employee/*`)**: Accent `#0F6E56` (Teal/Emerald). Focus on punch clocks, personal DTR, payslip archive, task planner.
  - **Admin Portal (`/admin/*`)**: Accent `#26215C` (Deep Purple/Indigo). Focus on HR operations, payroll finalization, DTR edit request approval, analytics.

---

## 2. Coding Rules & Best Practices

### Backend (PHP / Laravel)
1. **Strict Typing**: Use `declare(strict_types=1);` in new PHP classes. Specify explicit argument and return types.
2. **Thin Controllers**: Controllers must only receive requests, delegate to Services/Actions, and return Inertia or JSON responses.
3. **Form Requests**: Use dedicated Form Requests for all validation rules. Never validate inline inside controllers.
4. **Prevent N+1 Queries**: Always eager-load relationships (`with(...)`) on collections serialized to Inertia or API responses.
5. **Database Transactions**: Any mutation modifying multiple records, financial balances, payroll batches, or attendance punches must be wrapped inside `DB::transaction(...)`.
6. **Code Formatting**: Run Laravel Pint (`vendor/bin/pint`) to adhere to PSR-12 and Laravel coding standards.

### Frontend (React / Inertia / Tailwind)
1. **Form Handling**: Always use Inertia's `useForm` hook. Disable submit buttons during `processing` and display validation errors next to relevant inputs.
2. **Purity**: Avoid unnecessary `useEffect` hooks for derived calculations. Compute inline with `useMemo` or simple variables.
3. **Design Aesthetics**: Adhere strictly to the dual-portal color scheme, modern rounded cards, subtle shadows, and responsive layouts.
4. **Build Verification**: Run `npm run build` to verify JSX/CSS bundling after making frontend modifications.

### Domain Compliance (Philippine HR & Labor Standards)
1. **Timezone**: All timestamps must adhere to `Asia/Manila`.
2. **DTR Punch Flow**: Strict 4-punch sequence (`am_in` -> `am_out` -> `pm_in` -> `pm_out`). Locked once submitted.
3. **Payroll Cutoffs**:
   - 1st Cutoff (1st–15th): Base pay + full statutory deductions (SSS, PhilHealth, Pag-IBIG).
   - 2nd Cutoff (16th–EOM): Base pay + waived statutory deductions + split loans.
4. **13th Month Pay (RA 6686 / PD 851)**: Calculated strictly as `(daily_rate * DTR days present in period) / 12`.
5. **Immutability**: Finalized payrolls and 13th month batches cannot be modified or deleted.

---

## 3. Installed Skills Available in `.agents/skills/`

When performing specialized workflows, activate the corresponding skill:

### Stack & Domain Skills
- **`laravel-clean-architecture`**: Backend architectural patterns, Form Requests, Actions, Eloquent query optimization, Pint formatting.
- **`inertia-react-modern`**: React 19, Inertia.js 3 forms, Tailwind CSS 4 UI components, Recharts.
- **`pmpc-hris-payroll-engine`**: DTR 4-punch state machine, semi-monthly payroll logic, 13th month pay formulas, and statutory deductions.
- **`code-verification-quality`**: Automated verification runbook (`pint`, `php artisan test`, `npm run build`, migrations).

### Frontend & UI/UX Engineering Skills
- **`frontend-developer`**: React 19, Next.js, modern component architecture, state handling, and Core Web Vitals optimization.
- **`ui-ux-designer`**: Design systems, design tokens, component libraries, typography, and accessibility-first interfaces.
- **`tailwind-design-system`**: Tailwind CSS utility architecture, fluid typography, dark mode theming, and responsive design systems.
- **`react-modernization`**: Modern React patterns, functional components, hooks composition, and concurrent features.
- **`react-state-management`**: Scalable client state architectures, async data caching, and store design.
- **`frontend-mobile-development-component-scaffold`**: Production-ready, accessible, and responsive component scaffolding.
- **`accessibility-compliance-accessibility-audit`**: WCAG compliance, screen reader support, keyboard navigation, and inclusive design.
- **`ui-visual-validator`**: Visual consistency validation, viewport responsiveness, and design fidelity auditing.
- **`frontend-security-coder`**: XSS prevention, output sanitization, CSRF token handling, and secure client-side practices.
- **`e2e-testing-patterns`**: End-to-end frontend interaction testing, visual assertions, and user journey validation.
- **`playwright-component-testing`**: Isolated component testing and interaction verification with Playwright.

### Google Antigravity Core Engineering Skills
- **`code-review-specialist`**: Comprehensive code review across correctness, OWASP security, performance, clean architecture, and testability.
- **`systematic-debugging`**: 5-phase hypothesis-driven root-cause investigation, isolating minimal reproduction cases, and preventing regressions.
- **`git-workflow-pro`**: Conventional commits (`feat:`, `fix:`, `refactor:`, etc.), atomic staging, and safe branch/PR workflows.
- **`database-migrations-safety`**: Zero-data-loss schema alterations, rollback-safe migrations, and foreign key indexing.

---

## 4. Codebase Notes

### 4.1 Member registration

**Entry point:** No member-registration component or page exists. The closest implemented account-creation entry point is `resources/js/Pages/Admin/Employees.jsx`, which opens `resources/js/Components/EmployeeFormModal.jsx` for a super administrator.

**Trigger:** There is no member-registration trigger. For the employee-account counterpart, the `onClick={() => setShowForm(true)}` handler opens the modal, and its form `onSubmit={submit}` calls `submit` in `resources/js/Components/EmployeeFormModal.jsx`.

**Request:** No member-registration request exists. The employee-account counterpart is an Inertia `post('/admin/employees')` visit, which sends `POST /admin/employees`.

**Handler:** No member-registration handler exists. The counterpart is `store` on `App\Http\Controllers\Admin\EmployeeController` in `app/Http/Controllers/Admin/EmployeeController.php`.

**Validation:**

- Client-side: The employee modal uses native `required` attributes for first name, last name, email, password, and password confirmation; the email input is `type="email"`. It does not perform custom password matching or length checks in `resources/js/Components/EmployeeFormModal.jsx`.
- Server-side: No Form Request is used. `EmployeeController::store` performs inline validation in `app/Http/Controllers/Admin/EmployeeController.php`: required names (maximum 100 characters), unique email, confirmed password with a minimum length of 8, optional bounded profile fields, optional date hired, and an `active`/`inactive` status.

**Database layer:** No member model or member table exists. The counterpart creates `App\Models\Employee` in `employees` and then `App\Models\EmployeeGovernmentId` in `employee_government_ids`. `Employee::governmentIds()` is a `hasOne` relationship. The employee ID is generated by `Employee::generateEmployeeId()` before the employee is created; the government-ID row is linked by `employee_id` and cascades on employee deletion.

**Response:** No member-registration response exists. The counterpart redirects to the named `admin.employees` route with a success flash message. `resources/js/Pages/Admin/Employees.jsx` renders that message and `EmployeeFormModal` closes through its `onSuccess` callback.

**Edge cases observed:** “Member” is not a persisted domain concept in this codebase; this is a staff/employee-management system. The employee and government-ID records are created as separate writes without an explicit transaction. The sequential employee-ID generator reads the latest ID before inserting, so concurrent creates could produce the same next ID; the unique database constraint would then reject one request.

### 4.2 Member login / authentication

**Entry point:** No member login page exists. The shared workforce login page is `resources/js/Pages/Auth/Login.jsx`.

**Trigger:** The form uses `onSubmit={submit}`; `submit(event)` calls `event.preventDefault()` and then `post('/login')` in `resources/js/Pages/Auth/Login.jsx`.

**Request:** There is no member-authentication request. The shared flow is an Inertia `useForm` `post('/login')` visit, sending `POST /login`.

**Handler:** No member-authentication handler exists. The shared handler is `store` on `App\Http\Controllers\Auth\AuthenticatedSessionController` in `app/Http/Controllers/Auth/AuthenticatedSessionController.php`.

**Validation:**

- Client-side: The login and password inputs have native `required` attributes; the form uses `noValidate`, so browser validation messages are suppressed. The component renders returned `login` and `password` errors in `resources/js/Pages/Auth/Login.jsx`.
- Server-side: No Form Request is used. `AuthenticatedSessionController::store` performs inline validation requiring string `login` and `password` fields. It treats a syntactically valid email as `email`; otherwise it attempts authentication by `employee_id`. A failed attempt and an inactive account each raise a `login` validation error.

**Database layer:** No member model or member table exists. Authentication uses `App\Models\Employee` and the `employees` table through Laravel authentication. `Employee::isActive()` checks `status`; `Employee::isSuperAdmin()` selects the destination portal. The optional remember-me choice uses Laravel’s session/remember-token mechanisms.

**Response:** On success, the controller regenerates the session and redirects to `admin.dashboard` for a super administrator or `employee.dashboard` otherwise. On failure it returns validation errors to the Inertia page, which renders them beside the fields. The guest routes and role middleware are defined in `routes/web.php` and `app/Http/Middleware/EnsureRole.php`.

**Edge cases observed:** A non-email login string is always interpreted as an employee ID; there is no separate username path. The login page labels the example as `2026-00028`, while `Employee::generateEmployeeId()` generates IDs in the `EMP-0001` format. This documentation does not confirm whether existing seeded or production records use a third format.

### 4.3 Payroll batch creation

**Entry point:** `resources/js/Pages/Admin/Payroll.jsx`.

**Trigger:** The “Process new payroll” control calls `startPayroll()`, which validates the two dates in the browser and invokes `router.get('/admin/payroll/create', ...)`. On `resources/js/Pages/Admin/PayrollCreate.jsx`, the “Save payroll” button uses `onClick={submit}` and calls `submit()`.

**Request:** Both requests are Inertia visits: `GET /admin/payroll/create` with `period_from`, `period_to`, and `cutoff` query data, followed by `POST /admin/payroll` via `router.post`. These are not raw API calls.

**Handler:** `create` and `store` on `App\Http\Controllers\Admin\PayrollController` in `app/Http/Controllers/Admin/PayrollController.php`.

**Validation:**

- Client-side: `startPayroll()` requires both dates and rejects an end date before the start date in `resources/js/Pages/Admin/Payroll.jsx`. `PayrollCreate` permits only non-negative overtime inputs through input attributes, but submits no additional client-side validation in `resources/js/Pages/Admin/PayrollCreate.jsx`.
- Server-side: No Form Request is used. `PayrollController::create` validates dates and cutoff; `store` validates period fields, cutoff, a non-empty item array, employee existence, and non-negative numeric attendance and overtime values in `app/Http/Controllers/Admin/PayrollController.php`. Server-side validation is present, but it does not validate that `period_to` is on or after `period_from` in `store`.

**Database layer:** `create` reads active staff `App\Models\Employee` records from `employees`, sums relevant `App\Models\DtrLog` records from `dtr_logs`, and reads `App\Models\Setting` for `working_days_month`. `store` creates one `App\Models\Payroll` row in `payrolls` and one `App\Models\PayrollItem` row per submitted employee in `payroll_items`; it then calls `Payroll::recalculateTotals()`. `Payroll::items()` is `hasMany`, `Payroll::creator()` is `belongsTo(Employee::class, 'created_by')`, and each `PayrollItem` belongs to both a payroll and employee. Loan, capital-contribution, cash-advance, rental, savings, and other values are recurring employee deductions copied and split across cutoffs; there are no loan, dividend, savings-deposit, or savings-withdrawal transaction models or tables.

**Response:** `create` returns the Inertia page `Admin/PayrollCreate` with calculated employee preview data. `store` redirects to `admin.payroll.show` with a success flash message. The show action eager-loads each item’s employee and returns `Admin/PayrollShow`.

**Edge cases observed:** `PayrollItem::computeTotals()` recomputes earnings and deductions from current employee data rather than trusting client-submitted monetary totals. However, `PayrollController::store` creates the payroll, all items, and aggregate totals without an explicit database transaction; a failure mid-loop can leave a partial draft batch. It also calls `Employee::find()` after validating the employee exists, but the result could become null if the employee is deleted between validation and lookup. A repair migration, `database/migrations/2026_07_16_143457_add_rental_deduction_to_payroll_items_table.php`, explicitly states that it fixed a formerly missing `rental_deduction` column that caused payroll saves to fail after an earlier table recreation.

---

## 5. Known Issues

- ~~[SEVERITY: high] Employee dashboard Action Hub controls lack ARIA tablist, tab, and tabpanel relationships plus standard arrow-key navigation, preventing assistive technology from identifying and operating them as tabs — file: `resources/js/Pages/Employee/Dashboard.jsx`.~~ FIXED 2026-09-16, see `resources/js/Pages/Employee/Dashboard.jsx`

- ~~[SEVERITY: high] Payroll persistence is not atomic — file: `app/Http/Controllers/Admin/PayrollController.php`. `store()` creates the `payrolls` header, saves each `payroll_items` row in a loop, and recalculates totals as separate writes without `DB::transaction()`. An exception or database failure after the header or any earlier item save leaves a draft payroll with partial items and default or stale aggregate totals. The same path accepts duplicate `items.*.employee_id` values; the unique database constraint can then fail only after preceding writes have already persisted.~~ FIXED 2026-09-16, see `app/Http/Controllers/Admin/PayrollController.php`

- ~~[SEVERITY: medium] Employee account creation is not atomic — file: `app/Http/Controllers/Admin/EmployeeController.php`. `store()` writes the `employees` record and then separately creates its required `employee_government_ids` row, without a transaction. If the second write fails, an account remains usable but has no corresponding government-ID record. `Employee::generateEmployeeId()` also reads the latest ID before inserting; simultaneous account creations can generate the same ID, leaving one request rejected by the unique constraint.~~ FIXED 2026-09-17, see `app/Http/Controllers/Admin/EmployeeController.php` and `app/Models/Employee.php`

- ~~[SEVERITY: medium] Payroll save accepts chronologically invalid periods and duplicate batches — file: `app/Http/Controllers/Admin/PayrollController.php`. `create()` validates `period_to` with `after_or_equal:period_from`, but `store()` validates each date independently. A direct `POST /admin/payroll` can therefore persist a draft whose end date precedes its start date, and it can label either cutoff with arbitrary dates because no cutoff-date boundary is checked. Neither validation nor the `payrolls` schema prevents multiple batches for the same period and cutoff.~~ FIXED 2026-09-17, see `app/Http/Requests/Admin/StorePayrollRequest.php` and `app/Http/Controllers/Admin/PayrollController.php`

- ~~[SEVERITY: low] Login helper text uses a different ID format from generated accounts — file: `resources/js/Pages/Auth/Login.jsx`. The login page shows `2026-00028`, while `Employee::generateEmployeeId()` in `app/Models/Employee.php` generates `EMP-0001`, `EMP-0002`, and so on. This is cosmetic for generated accounts: authentication treats non-email input as `employee_id`, so an actual `EMP-0001` value succeeds. The example only causes a failed login if a user enters it verbatim and no employee has that exact stored ID.~~ FIXED 2026-09-16, see `resources/js/Pages/Auth/Login.jsx`

- [SEVERITY: low] Rental-deduction schema repair depends on the migration remaining applied — file: `database/migrations/2026_07_16_143457_add_rental_deduction_to_payroll_items_table.php`. This migration restores `payroll_items.rental_deduction`, which `PayrollItem::computeTotals()` and `PayrollController` currently read and write. The current migration sequence includes the repair after the table recreation and no later migration removes the column, so normal up-to-date deployments do not regress the original failure. A database left before this migration, or an explicit rollback of it while current code runs, restores the “Unknown column `rental_deduction`” payroll-save failure.

---

## 6. Versioning Rules

- **PATCH (`x.x.+1`)**: Bug fixes with no behavior change for the end user, such as fixing the missing database-transaction issue.
- **MINOR (`x.+1.0`)**: Backward-compatible new features, such as adding a new payroll report type.
- **MAJOR (`+1.0.0`)**: Breaking changes, such as changing the employee-ID format or an API response shape on which existing frontend code depends.

Every code change from either Codex or Antigravity must be logged under `## [Unreleased]` in `CHANGELOG.md`, categorized as Added, Changed, Fixed, or Security, before it is committed. Version numbers are assigned only when the user explicitly says “cut a release”; do not assign a version automatically for a commit.
