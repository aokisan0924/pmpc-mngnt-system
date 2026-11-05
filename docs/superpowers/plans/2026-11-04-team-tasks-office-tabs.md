# Team tasks office tabs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the mixed people/office pills with office tabs (All + three offices + Late) and a people row that narrows to the chosen office, and remove the Office dropdown.

**Architecture:** `TeamTaskController::index` returns `offices` (always the three offices, filter-independent) and a `people` list narrowed to the chosen office, and swaps the `group` filter for `whole=1` (needs an office). `TeamPeopleStrip.jsx` is rewritten as office tabs plus the people row; `TeamTasks.jsx` drops the Office dropdown.

**Tech Stack:** Laravel 13, PHPUnit (sqlite), Inertia/React 19, Tailwind 4.

**Spec:** `docs/superpowers/specs/2026-11-04-team-tasks-office-tabs-design.md`

## Global Constraints

- Admin-assigned tasks only (`Task::assignedByAdmin()`); late = not done and `due_date` before today (Asia/Manila).
- Only active employees get a person chip; their own tasks still count in tab and Everyone totals.
- Tab counts ignore every filter; `people` follows only the chosen office; status cards follow office, person, whole, priority, older (not Late).
- `group` query parameter is removed everywhere (backend, frontend, tests).
- Buttons with `aria-pressed`, visible focus ring, theme text tokens, accent `#26215C`, no thick colored side borders, no horizontal page scroll on a phone.
- `vendor/bin/pint` on PHP, `npm run build` after frontend edits, commit `public/build`. Commit messages end with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## Review Focus

- An office with zero open tasks still shows as a tab with 0.
- Choosing an office tab clears the person and `whole`; `whole=1` without an office is ignored.
- A person with open tasks in two offices appears in both people rows with each office's own count.
- `Whole office` chip appears only with an office chosen and only when no-person tasks exist there.
- A chosen person without open tasks in the chosen office stays visible as the selected chip.
- Old `?group=cubao` bookmarks fall back to All without an error.

---

### Task 1: `offices` summary, office-scoped `people`, `whole` filter

**Files:**
- Modify: `app/Http/Controllers/TeamTaskController.php` (`index`, `people`, new `offices`)
- Modify tests: `tests/Feature/TeamTaskPeopleTest.php`, `tests/Feature/TeamTaskStatusCountsTest.php`

**Interfaces:**
- Props: `offices`: `[{key, label, open, late}]` for each key of `Task::OFFICES` in that order. `people`: `[{type: 'employee'|'whole', key, label, open, late}]`, employees first (late desc, open desc, label asc), then at most one `whole` entry (`key` = the chosen office, `label` = "Whole office") only when an office is chosen and its no-person open count is above 0. `filters.whole`: bool; `filters.group` is gone.
- Query: `whole=1` is honoured only with a valid `office` and without `employee_id`; it adds `whereNull('employee_id')` to the task list and the status counts.

- [ ] **Step 1: Update and add tests** (write first, run, watch fail):
  - In `TeamTaskPeopleTest`: replace the office-chip test with `test_whole_office_chip_appears_only_with_an_office_chosen` (no chip on `/admin/team-tasks`; with `?office=cubao` one `['type'=>'whole','key'=>'cubao','label'=>'Whole office','open'=>2,'late'=>0]` last in the list); replace the two `group` tests with `whole` versions (`?office=cubao&whole=1` shows only no-person cubao tasks and `filters.whole` true; `whole=1` without office or with `employee_id` is ignored; `?group=cubao` is ignored and `filters` has no `group`).
  - Add `test_people_narrow_to_the_chosen_office_with_that_offices_counts`: a person with 2 cubao and 1 main_office open tasks shows `open 2` under `?office=cubao`, `open 1` under `?office=main_office`, 3 with no office; someone with only main_office tasks is absent under cubao.
  - Add `test_offices_lists_all_three_with_counts_and_ignores_filters`: all three keys in order incl. a zero office; identical with `?office=cubao&priority=low&overdue=1&employee_id=<id>`; inactive employee's task counted.
  - In `TeamTaskStatusCountsTest`: replace the `?group=cubao` assertion with `?office=cubao&whole=1` (expects 1).
- [ ] **Step 2: Run** `php artisan test --filter='TeamTaskPeopleTest|TeamTaskStatusCountsTest'`. Expected: new/changed tests FAIL.
- [ ] **Step 3: Implement:** replace `$group` with `$whole = $request->boolean('whole') && $office && ! $employeeId`; stop nulling `$office`; `$scoped` adds `->when($whole, fn ($q) => $q->whereNull('employee_id'))`; `people(?string $office)` filters tasks by `office` when given, drops the old office-chip branch, appends the `whole` entry as described; new `private function offices(): array` groups all open admin-assigned tasks by `office`; pass `'offices'`, `'people' => $this->people($office)` and `'whole' => $whole` in `filters`.
- [ ] **Step 4: Run** `php artisan test --filter='TeamTask|Recurring|AdminDashboard'`; `vendor/bin/pint app tests`. Expected: all pass.
- [ ] **Step 5: Commit** `feat(admin): office summary and office-scoped people for team tasks`.

### Task 2: Office tabs and people row UI

**Files:**
- Rewrite: `resources/js/Components/TeamPeopleStrip.jsx` (keep the name; it now renders two rows)
- Modify: `resources/js/Pages/Admin/TeamTasks.jsx`

**Interfaces:**
- Consumes Task 1 props. Produces `TeamPeopleStrip({ offices, people, employees, overview, filters, onFilter })`; `onFilter` takes partial filters (`office`, `whole`, `employee_id`, `overdue`).

- [ ] **Step 1: Build the component.**
  - Row 1 (`<nav aria-label="Office">`, segmented container): `All {overview.open}` (selected when no office), one tab per `offices` entry `{label} {open}` (selected when `filters.office === key`; click toggles; sets `{office: key-or-'', employee_id: '', whole: ''}`), then the red `{overview.overdue} late` chip when above 0 or active (existing toggle).
  - Row 2 (`<section aria-label="Filter by person">`): first chip `Everyone {n}` (n = chosen office's `open`, else `overview.open`; text "Everyone in {office label}" when an office is chosen); selected when no person and no whole. Person chips from `people` type `employee` with the fold at 8, "+N more" toggle, and the selected-person fallback (reuse the logic and `aria-label`s already in the file). `whole` chip (building icon, "Whole office N") toggles `{whole: 1-or-'', employee_id: ''}`.
- [ ] **Step 2: Edit `TeamTasks.jsx`:** remove the Office `<label>`/`<select>` from the toolbar; pass `offices`; in `applyFilters` replace `group` with `if (merged.whole) query.whole = 1`.
- [ ] **Step 3: Verify** `npm run build`; run against the scratch sqlite (`database/taskboard-preview.sqlite`, ADM-0001 / `password123`, localhost only; reseed if empty) and check in Chrome: all three offices show including one with 0; tab click filters board and cards and narrows people; second click returns to All; Whole office chip; person chip inside an office; Late chip; console clean; screenshot.
- [ ] **Step 4: Commit** `feat(admin): office tabs and people row on team tasks`, then `build: rebuild assets for the office tabs`.

### Task 3: Docs and final checks

- [ ] **Step 1:** In `CHANGELOG.md` (Unreleased > Added) rewrite the people-strip bullet to describe office tabs, the people row and the Whole office chip; note the Office dropdown is gone. Run `vendor/bin/pint --test app tests`, `php artisan test` (only the known JPEG error allowed), `npm run build`.
- [ ] **Step 2: Commit** `docs: changelog for the office tabs`. Do not deploy; the user approves that separately.
