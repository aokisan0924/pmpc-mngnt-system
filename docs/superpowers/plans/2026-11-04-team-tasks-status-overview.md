# Team tasks status overview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three status cards (To do, Doing, Done) with a progress bar above the people pills on admin Team tasks.

**Architecture:** `TeamTaskController::index` returns `status_counts` computed with the same person/office/group/priority filters as the task list, minus the `overdue` filter. A new `TeamStatusOverview` component renders the cards and bar; `TeamTasks.jsx` places it between the header and the people strip.

**Tech Stack:** Laravel 13, PHPUnit (sqlite), Inertia/React 19, Tailwind 4.

**Spec:** `docs/superpowers/specs/2026-11-04-team-tasks-status-overview-design.md`

## Global Constraints

- Timezone `Asia/Manila`; late = status not `done` and `due_date` before today.
- Admin-assigned tasks only (`Task::assignedByAdmin()`).
- Done count follows the board rule: `updated_at` within 30 days, or all when `older=1`.
- Cards are not buttons. The bar is `aria-hidden`; the percentage is in the Done card text.
- Use theme text tokens (`text-text`, `text-sub`), accent `#26215C`, no thick side borders; stack/shrink cleanly on a phone, no horizontal scroll.
- `vendor/bin/pint` on PHP, `npm run build` after frontend edits, commit `public/build`. Commit messages end with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## Review Focus

- Counts with no tasks: all zeros, "0% finished", no division by zero.
- The Late chip (`overdue=1`) must not change `status_counts`.
- Done tasks older than 30 days are excluded unless `older=1`, and the note says which.
- A person or group filter changes the counts; the people chips' own counts do not change.
- Personal tasks (no `assigned_by`) are never counted.

---

### Task 1: `status_counts` prop

**Files:**
- Modify: `app/Http/Controllers/TeamTaskController.php` (`index`, new private `statusCounts`)
- Test: `tests/Feature/TeamTaskStatusCountsTest.php` (new; same setUp style as `TeamTaskPeopleTest`)

**Interfaces:**
- Produces Inertia prop `status_counts`: `{todo: int, doing: int, done: int, late: int}`. `todo` = pending, `doing` = doing, `done` = done within the done rule, `late` = open and overdue.
- Consumes the existing filter values in `index` (`$employeeId`, `$priority`, `$office`, `$group`, `$showOlder`).

- [ ] **Step 1: Write failing tests**, one per behaviour, asserting `status_counts` exactly:
  - `test_counts_each_status_and_the_late_ones`: pending (one overdue), doing, done (fresh) → `{todo: 2, doing: 1, done: 1, late: 1}`.
  - `test_done_is_limited_to_30_days_unless_older_is_ticked`: a done task with `updated_at` 40 days ago is excluded by default and included with `?older=1`.
  - `test_counts_follow_person_group_office_and_priority_filters`: one assertion per filter.
  - `test_counts_ignore_the_late_filter`: `?overdue=1` returns the same counts as no filter.
  - `test_personal_tasks_are_not_counted_and_zero_tasks_give_zeros`.
- [ ] **Step 2: Run** `php artisan test --filter=TeamTaskStatusCountsTest`. Expected: FAIL (`status_counts` missing).
- [ ] **Step 3: Implement** in `TeamTaskController`: pull the person/group/office/priority `->when(...)` lines into a closure or private method reused by the task list and by `private function statusCounts(...): array`; count with cloned queries per status; keep the task list result unchanged.
- [ ] **Step 4: Run** `php artisan test --filter='TeamTask|Recurring|AdminDashboard'`. Expected: all pass. Run `vendor/bin/pint app tests`.
- [ ] **Step 5: Commit** `feat(admin): status counts for team tasks`.

### Task 2: Status cards and page layout

**Files:**
- Create: `resources/js/Components/TeamStatusOverview.jsx`
- Modify: `resources/js/Pages/Admin/TeamTasks.jsx`

**Interfaces:**
- Consumes `status_counts` from Task 1 and `filters.older`.
- Produces `export default function TeamStatusOverview({ counts, older })`.

- [ ] **Step 1: Build `TeamStatusOverview`**: a `<section aria-label="Task status overview">` with three cards in a grid (`grid-cols-3`, smaller text on narrow screens). Each card: small uppercase label, big `tnum` count, a note line. To do note: "{late} late" in rose when `late > 0`, else "waiting". Doing note: "in progress". Done note: "{pct}% finished · {older ? 'all time' : 'last 30 days'}" where pct = round(done / (todo + doing + done) * 100), 0 when the total is 0. Under the cards, an `aria-hidden` bar (green done, amber doing, grey remainder).
- [ ] **Step 2: Edit `TeamTasks.jsx`**: accept `status_counts` (default zeros), render `TeamStatusOverview` between `AdminPageHeader` and `TeamPeopleStrip`.
- [ ] **Step 3: Verify** `npm run build`; run the app against the scratch sqlite (`database/taskboard-preview.sqlite`, ADM-0001 / `password123`, localhost only; seed again if empty) and check in Chrome: counts match the board columns, choosing a person updates the cards, the Late chip does not change them, ticking the older checkbox changes the Done note, the layout at desktop width, console clean. Screenshot.
- [ ] **Step 4: Commit** `feat(admin): status overview cards on team tasks`, then `build: rebuild assets for the status overview`.

### Task 3: Docs and final checks

- [ ] **Step 1:** Update the people-strip line in `CHANGELOG.md` (Unreleased > Added) to mention the status cards. Run `vendor/bin/pint --test app tests`, `php artisan test` (expect only the known JPEG error), `npm run build`.
- [ ] **Step 2: Commit** `docs: changelog for the status overview`. Do not deploy; the user approves that separately.
