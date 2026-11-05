# Team tasks people strip Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the three overview pills and the Employee dropdown on admin Team tasks with a strip of chips (Everyone, Late, one per person, one per whole-office group) that filter the board and calendar.

**Architecture:** `TeamTaskController::index` returns a `people` summary computed from all open admin-assigned tasks, ignoring the board filters, and accepts a new `group` filter. A new `TeamPeopleStrip` component renders the chips; `TeamTasks.jsx` drops the pills and the Employee dropdown and uses it.

**Tech Stack:** Laravel 13, PHPUnit (sqlite in-memory), Inertia/React 19, Tailwind 4.

**Spec:** `docs/superpowers/specs/2026-11-04-team-tasks-people-strip-design.md`

## Global Constraints

- Timezone `Asia/Manila`; "late" = status not `done` and `due_date` before today (same as `overview()`).
- Only admin-assigned tasks (`Task::assignedByAdmin()`), never personal tasks.
- Only active employees get a person chip (`status = 'active'`).
- Admin accent `#26215C`. No thick colored side borders. Chips are `<button type="button">` with `aria-pressed` and a visible focus ring (`focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600`).
- Phone width: the strip wraps, no horizontal page scroll.
- Run `vendor/bin/pint` on changed PHP and `npm run build` after frontend edits; commit `public/build`.
- Every commit message ends with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## Review Focus

- A person with only done tasks gets no chip; an inactive employee with open tasks gets none (their tasks still count in Everyone).
- Clicking a chip must not make other chips vanish (summary ignores `employee_id`, `group`, `office`, `priority`, `overdue`, `older`).
- Whole-office group chip filters to `employee_id` null tasks only, not that office's people tasks.
- `employee_id` and `group` both in the URL: `group` is ignored.
- Zero open tasks: strip still shows "Everyone · 0", no Late chip, no crash.
- Many people (20+): overflow control works and chips are keyboard reachable.

---

### Task 1: `people` summary and `group` filter

**Files:**
- Modify: `app/Http/Controllers/TeamTaskController.php` (`index`, `overview`, new private `people`)
- Test: `tests/Feature/TeamTaskPeopleTest.php` (new); `tests/Feature/TeamTaskOverviewTest.php` (remove the `due_this_week` assertion)

**Interfaces:**
- Produces Inertia props on `Admin/TeamTasks`:
  - `people`: list of `{type: 'employee'|'office', key: string, label: string, open: int, late: int}`. For `employee`, `key` is the employee id as a string and `label` is "First Last". For `office`, `key` is the `Task::OFFICES` key and `label` is the office label. Order: people before office groups; within each, `late` desc, `open` desc, `label` asc. Only entries with `open >= 1`.
  - `overview`: `{overdue: int, open: int}` (the `due_this_week` key is removed).
  - `filters.group`: the valid office key or `null`.
- Query `?group=<office key>`: only tasks with `employee_id` null and that `office`. Ignored when `employee_id` is also given or when the key is not in `Task::OFFICES`.

- [ ] **Step 1: Write the failing tests** in `TeamTaskPeopleTest` (same setUp style as `TeamTaskOverviewTest`: `Carbon::setTestNow('2026-11-04 10:00' Asia/Manila)`, super admin, helper `task()`):
  - `test_people_lists_active_people_with_open_and_late_counts_sorted`: Maria 2 open (1 late), Juan 3 open (0 late), Ana 1 open (1 late) → order Maria, Ana, Juan; assert `people.0` equals `['type'=>'employee','key'=>(string)$maria->id,'label'=>'Maria Santos','open'=>2,'late'=>1]`.
  - `test_people_leaves_out_done_only_inactive_and_personal_tasks`: a person with only a done task, an inactive employee with an open task, and a personal task (no `assigned_by`) produce no chips.
  - `test_whole_office_tasks_get_an_office_chip_after_the_people`: two open tasks with `employee_id` null, office `cubao` → last entry `['type'=>'office','key'=>'cubao','label'=>'Cubao Office','open'=>2,'late'=>0]`.
  - `test_people_ignore_the_board_filters`: GET with `?employee_id=<maria>&priority=low&overdue=1` returns the same `people` as the unfiltered GET.
  - `test_group_filter_shows_only_whole_office_tasks`: GET `?group=cubao` returns only the `employee_id`-null cubao tasks, not a person's cubao task; `filters.group` is `cubao`.
  - `test_group_is_ignored_with_an_employee_or_an_unknown_key`: `?group=cubao&employee_id=<maria>` returns Maria's tasks; `?group=nope` returns all tasks and `filters.group` is null.
  - `test_people_is_empty_when_nothing_is_open`: `people` is `[]`, `overview.open` is 0.
  - In `TeamTaskOverviewTest`, drop the `overview.due_this_week` assertions.
- [ ] **Step 2: Run** `php artisan test --filter='TeamTaskPeopleTest|TeamTaskOverviewTest'`. Expected: new tests FAIL (`people` missing / `group` ignored), not error out on syntax.
- [ ] **Step 3: Implement** in `TeamTaskController`:
  - `index`: read `$group` = `$request->query('group')` kept only when `array_key_exists` in `Task::OFFICES` and no `employee_id`; add `->when($group, fn ($q) => $q->whereNull('employee_id')->where('office', $group))` to the task query; pass `'people' => $this->people()` and `'group' => $group` in `filters`.
  - `private function people(): array`: load open admin-assigned tasks with `employee:id,first_name,last_name,status`, group in PHP by employee (skip inactive or missing employees) and by office for `employee_id` null; build, sort, and return the list described above.
  - `overview()`: remove `due_this_week`.
- [ ] **Step 4: Run** the same command plus `php artisan test --filter='TeamTask|Recurring'`. Expected: all pass.
- [ ] **Step 5: Commit** `feat(admin): people summary and office-group filter for team tasks` (run `vendor/bin/pint app tests` first).

### Task 2: People strip component and page

**Files:**
- Create: `resources/js/Components/TeamPeopleStrip.jsx`
- Modify: `resources/js/Pages/Admin/TeamTasks.jsx`

**Interfaces:**
- Consumes: Task 1 props `people`, `overview.open`, `overview.overdue`, `filters.group`.
- Produces: `export default function TeamPeopleStrip({ people, overview, filters, onFilter })`. `onFilter(next)` takes a partial filters object (same shape `applyFilters` already takes).

- [ ] **Step 1: Build `TeamPeopleStrip`** with these rules:
  - First chip "Everyone · {overview.open}", selected (`aria-pressed`) when no `employee_id` and no `group`; click calls `onFilter({ employee_id: '', group: '' })`.
  - Late chip "{overview.overdue} late", rendered when `overview.overdue > 0` or `filters.overdue`; rose style; click calls `onFilter({ overdue: !filters.overdue })`.
  - For each `people` entry: chip text "{label} · {open}" plus a rose "{late} late" badge when `late > 0`. Employee chips are selected when `String(filters.employee_id) === key`; click toggles via `onFilter({ employee_id: selected ? '' : key, group: '' })`. Office chips are selected when `filters.group === key`; click toggles via `onFilter({ group: selected ? '' : key, employee_id: '' })`. Office chips use a lighter fill and a small building icon so they read as groups.
  - Show the first 8 entries; when there are more, a "+N" button toggles showing all (`aria-expanded`).
  - Wrapper `<section aria-label="Filter by person or office" className="flex flex-wrap items-center gap-2">`.
- [ ] **Step 2: Edit `TeamTasks.jsx`:**
  - Import and render `TeamPeopleStrip` where the overview `<section>` is; accept `people = []` prop.
  - Delete the overview pills section and the Employee `<label>`/`<select>`.
  - `applyFilters` also copies `merged.group` into `query.group`.
  - Merge the Board/Calendar tabs and the filter bar into one row: a flex-wrap container holding the tabs, Office, Priority and the older checkbox. Keep the drag hint under it for the board view only.
- [ ] **Step 3: Verify** `npm run build` passes. Then run the app against the scratch sqlite (`taskboard-preview.sqlite`, login ADM-0001 / `password123`, localhost only) and check in Chrome: chips render and filter the board and calendar, clicking the selected chip clears it, chips for other people stay while one is selected, `?group=cubao` filters, phone width (390px) wraps without horizontal scroll, keyboard Tab reaches chips. Take a screenshot.
- [ ] **Step 4: Commit** `feat(admin): people strip on team tasks`, then `build: rebuild assets for the people strip`.

### Task 3: Docs and final checks

**Files:** Modify `CHANGELOG.md` (under `## [Unreleased]`, Changed: Team tasks has a people strip replacing the pills and Employee filter; overview pills removed).

- [ ] **Step 1:** Update `CHANGELOG.md`. Run `vendor/bin/pint --test app tests` (expect pass), `php artisan test` (expect all pass except the known JPEG-less `EmployeeSignatureTest` error), `npm run build`.
- [ ] **Step 2: Commit** `docs: changelog for the people strip`. Do not deploy; the user approves the deploy separately.
