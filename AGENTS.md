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

### Google Antigravity Core Engineering Skills
- **`code-review-specialist`**: Comprehensive code review across correctness, OWASP security, performance, clean architecture, and testability.
- **`systematic-debugging`**: 5-phase hypothesis-driven root-cause investigation, isolating minimal reproduction cases, and preventing regressions.
- **`git-workflow-pro`**: Conventional commits (`feat:`, `fix:`, `refactor:`, etc.), atomic staging, and safe branch/PR workflows.
- **`database-migrations-safety`**: Zero-data-loss schema alterations, rollback-safe migrations, and foreign key indexing.

