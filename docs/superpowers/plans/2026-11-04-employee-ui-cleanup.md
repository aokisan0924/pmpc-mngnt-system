# Employee Screens: Compact Header and Text Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (chosen). Steps use checkbox (`- [ ]`) syntax.

**Goal:** Employee screens open with a compact green header and carry no redundant or filler text, with content ordered by what needs the user.

**Architecture:** One shared change to `EmployeePageHeader.jsx` (compact single row, no eyebrow or description), then a per-page pass against six cleanup rules. Frontend only: no routes, data, or logic change.

**Tech Stack:** React 19, Inertia 3, Tailwind 4, Vite. Checks: `npm run build`, existing PHPUnit and Node tests, browser screenshots.

**Spec:** `docs/superpowers/specs/2026-11-04-employee-ui-cleanup-design.md`

## Global Constraints
- Cleanup rules (spec): no eyebrow/description in headers; a number appears once per screen; metric sub-text stays only if it adds information; no filler section descriptions; status as short text plus colour; one-line empty states.
- Do not change what data a page shows, DTR/payroll logic, URLs, or roles. Attendance log still lists every calendar day (future days may be quieter).
- Keep 44px touch targets, visible focus, contrast; no new fonts, libraries or dark theme; mobile bottom nav stays.
- Employee accent `#0F6E56`; keep existing tokens and the logo.
- Frontend text that tests assert must keep passing: check `tests/e2e` and `tests/Feature` for strings before removing them.

## Review Focus
- No information staff rely on disappears (punch times, net pay, daily rate, status, due dates).
- Headers still read correctly at 390px width (title, chip and action do not collide or wrap badly).
- A removed sub-text does not leave an empty gap or orphaned separator.
- Every page still has exactly one h1, and screen readers still get names for icon-only controls.
- Text removed from pages was not the only label for a control (aria-labels and form labels intact).

---

### Task 1: Compact header and account-setup notice
**Files:** Modify `resources/js/Components/EmployeePageHeader.jsx`, `resources/js/Components/AccountSetupNotice.jsx`, and every employee page that passes `eyebrow` or `description` (`Dtr`, `Notifications`, `Payslips`, `Planner`, `Profile`).
- [ ] Capture "before" screenshots of all employee screens at 1440px and 390px (scratch folder).
- [ ] Grep `tests/` for strings being removed; keep tests green.
- [ ] Header: single row, `p-4 sm:p-5`, title `text-xl sm:text-2xl`, chip and action on the same row, `leading` kept smaller; stop rendering `eyebrow` and `description`; remove those props from the callers (Profile keeps ID and department/position as one compact chip line).
- [ ] Notice: shorten to one line, for example "Finish your account setup" with the existing "Complete setup" link.
- [ ] `npm run build`; screenshot the five pages; commit.

### Task 2: Dashboard
**Files:** Modify `resources/js/Pages/Employee/Dashboard.jsx` (and `MobileHeader.jsx` only if it repeats the title).
- [ ] Apply the rules to the hero, today's punches, "at a glance" cards, tasks/alerts tabs and payslip card: drop repeated phrases, restating sub-text and filler descriptions; keep punch controls, times and cutoff info where they are.
- [ ] Order: next required action, then today, then summaries.
- [ ] Build, screenshot desktop and phone, run Node/PHP tests touching the dashboard; commit.

### Task 3: Attendance (`Dtr.jsx`)
- [ ] Rules pass on week strip, log header, row labels, empty states; future "Not yet" rows styled quieter (not removed); header chip stays one short status.
- [ ] Build, screenshot, commit.

### Task 4: Payslips (`Payslips.jsx`)
- [ ] Remove restating sub-text on the four metric cards and the explanatory banner wording; keep period list and the net compensation highlight; one-line empty states.
- [ ] Build, screenshot, commit.

### Task 5: My tasks, Notifications, Profile, Account setup
- [ ] `Planner.jsx`: header chip is the only pending count; board/agenda text trimmed; no duplicate counts.
- [ ] `Notifications.jsx`: tab counts are the only counts; short empty states.
- [ ] `Profile.jsx`: banner becomes the compact header with avatar, name, one chip line, daily rate as a small figure; field helper text only where it prevents a mistake.
- [ ] `AccountSetup.jsx`: scan against the rules, fix the obvious repeats.
- [ ] Build, screenshot, commit.

### Task 6: Final checks
- [ ] `npm run build`, `vendor/bin/pint --test`, `php artisan test`, Node tests, and the existing Playwright smoke/a11y specs if they run locally.
- [ ] After screenshots of every screen, desktop and phone; compare against before; CHANGELOG entry; commit build output.
- [ ] Stop and show the screenshots to the user; ask before deploying.
