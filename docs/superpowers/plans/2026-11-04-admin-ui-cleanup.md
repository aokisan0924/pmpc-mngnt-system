# Admin Screens: Compact Header, Consistent Layout and Text Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (chosen). Steps use checkbox (`- [ ]`) syntax.

**Goal:** Admin screens open with a compact indigo header, share two page widths, and carry no filler or repeated text.

**Architecture:** One shared change to `AdminPageHeader.jsx` and the page-width rule, then a per-page pass against the six cleanup rules in three groups. Frontend only.

**Tech Stack:** React 19, Inertia 3, Tailwind 4, Vite. Checks: `npm run build`, PHPUnit and Node tests, browser screenshots.

**Spec:** `docs/superpowers/specs/2026-11-04-admin-ui-cleanup-design.md` (rules from `2026-11-04-employee-ui-cleanup-design.md`).

## Global Constraints
- Cleanup rules: no eyebrow/description in headers; a number once per screen; metric sub-text only if it adds information; no filler section text; short status text plus colour; one-line empty states. Keep only chips that carry a count, period or status.
- Do not change payroll math, exports, DTR rules, URLs, roles, or what data a page shows. Keep 44px targets, visible focus, contrast. No new fonts or libraries.
- Admin accent `#26215C`. Two page widths only: wide (default `.admin-page-shell`) and narrow (forms/settings).
- Strings asserted by tests must keep passing: grep `tests/` before removing text.

## Review Focus
- No figure admins use to check pay disappears (gross, deductions, net, periods, signatories); exports and print views unchanged.
- Headers stay readable at 390px (title, chip and action do not collide).
- A removed description does not leave an orphaned separator or empty gap; every page keeps exactly one h1.
- Icon-only controls keep their accessible names.

### Task 1: Shared header, widths, Payroll header
- [ ] `AdminPageHeader.jsx`: compact single row, stop rendering `eyebrow`/`description`; keep `leading`, `meta`, `action`, chip.
- [ ] Find why the Payroll header looks washed out and fix it; define the wide/narrow width rule and replace per-page `max-w-*` classes.
- [ ] Remove `eyebrow`/`description` from all callers; keep real chips, drop decorative ones; move header data (employee ID/department, period) into the single chip.
- [ ] Build, screenshot, commit.

### Task 2: People and attendance pages
- [ ] Employees (fix cut-off "View Profile", emphasize status), Employee record, Attendance records, an employee's attendance, DTR edit requests, Account setups, Team tasks: rules pass and order by what needs attention.
- [ ] Build, screenshot, commit.

### Task 3: Compensation pages
- [ ] Payroll batches (net pay primary), Payroll input (keep one short instruction line), Saved payroll batch, Payroll analytics, 13th month (3 pages), DTR archives: rules pass.
- [ ] Verify an export and a print view are unchanged. Build, screenshot, commit.

### Task 4: Dashboard, Settings, login contrast
- [ ] Operations dashboard trimmed (punch station kept); Settings tabs text; login/forgot/reset: placeholder contrast and Sign in button not looking disabled.
- [ ] Build, screenshot, commit.

### Task 5: Final checks
- [ ] Build, Pint, full tests, Node tests; desktop and phone screenshots of every admin screen; CHANGELOG; commit build; ask before deploying.
