# Task Date Span and Tidy Team Tasks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tasks can carry an optional start date (a span to the due date), shown as Upcoming / range / progress bar on both portals, and the admin Team tasks page gets the "tidy board" layout with dropdown filters.

**Architecture:** One nullable `tasks.start_date` column. `Task::toPlannerArray()` derives `span_label`, `is_upcoming`, `span_progress` so every page reads the same values. Admin validation lives in `TeamTaskRequest` (new `due_type` value `span`); employee validation stays inline in `TaskController`. The shared React components (`TaskFormModal`, `TaskBoard`, `TaskDetailModal`) render the span for both portals; `TeamTasks.jsx` is re-laid out.

**Tech Stack:** Laravel 13, PHP 8.3, PHPUnit feature tests (`RefreshDatabase`, `Carbon::setTestNow`), React 19, Inertia 3, Tailwind 4, Vite.

**Spec:** `docs/superpowers/specs/2026-11-11-task-date-span-and-team-tasks-layout-design.md`

## Global Constraints

- Every "today" is `Asia/Manila` (`now('Asia/Manila')->toDateString()`).
- `start_date` must be on or before `due_date` and needs a `due_date`; start equal to due is saved as `null`.
- No spans on recurring tasks: `start_date` is prohibited with `due_type` `recurring` or `none`, and on copies made by a repeat rule.
- Late / due today / sorting / reminders keep using `due_date` only. Existing tasks (no start date) must look and behave exactly as today.
- Upcoming = `start_date` > today and status not `done`. Upcoming tasks still count as open everywhere.
- Admin accent `#26215C`; employee accent `#0F6E56`. Use the existing `Badge` variant `upcoming` for the Upcoming tag.
- Branch `feature/task-date-span` (already created off `origin/main`, holds the spec commit). Do not push or deploy.
- Each commit: `vendor/bin/pint --dirty`; frontend tasks also `npm run build` and commit `public/build`. `CHANGELOG.md` `[Unreleased]` entry before the last commit.
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. Editing a spanned task and moving the due date before its start → validation error on `start_date`, nothing saved (Task 2 and Task 3 tests).
2. Editing a **shared** task keeps / updates `start_date` (the shared branch of `TeamTaskController::update` has its own field list) (Task 2 test).
3. In the admin form, typing a Start under Date span then switching to Recurring or No due date must not send that start (Task 5, manual check; server also rejects it, Task 2 test).
4. A span crossing month boundaries shows on the calendar only on the visible month's days, and a span starting before the month still shows from day 1 (Task 7 manual check).
5. An employee saving the edit form on an admin-assigned spanned task without touching Start keeps the start date (form always sends it; Task 3 test).

---

### Task 1: `start_date` column and derived planner fields

**Files:**
- Create: `database/migrations/2026_11_11_000000_add_start_date_to_tasks_table.php`
- Modify: `app/Models/Task.php` (`$fillable`, `$casts`, a `saving` normalizer, `toPlannerArray()`)
- Test: `tests/Feature/TaskDateSpanModelTest.php`

**Interfaces:**
- Produces: `tasks.start_date` (nullable date, after `due_date`); `Task::isUpcoming(): bool`; `toPlannerArray()` keys `start_date` (`'Y-m-d'|null`), `span_label` (`'M d → M d'`, e.g. `'Nov 10 → Nov 20'`, or null; add the year to both ends only when start and due are in different years: `'Dec 28, 2026 → Jan 5, 2027'`), `is_upcoming` (bool), `span_progress` (int 0–100 or null).

- [ ] **Step 1: Write the failing tests** (`Carbon::setTestNow('2026-11-12 10:00', 'Asia/Manila')`)
  - `test_start_equal_to_due_is_saved_as_null`: create task with `start_date` = `due_date` = `2026-11-20` → `start_date` is null.
  - `test_start_is_cleared_when_due_date_is_cleared`: task with span, update `due_date` null → `start_date` null.
  - `test_span_fields_for_a_running_span`: start `2026-11-10`, due `2026-11-20` → `span_label === 'Nov 10 → Nov 20'`, `is_upcoming === false`, `span_progress === 27` (day 3 of 11: `floor(3/11*100)`).
  - `test_upcoming_span`: start `2026-11-18`, due `2026-12-05` → `is_upcoming === true`, `span_progress === 0`.
  - `test_done_task_is_never_upcoming_and_has_no_progress`: same as above with `status => 'done'` → `is_upcoming === false`, `span_progress === null`.
  - `test_task_without_start_has_null_span_fields`: `start_date`, `span_label`, `span_progress` null; `is_upcoming` false.
- [ ] **Step 2: Run** `php artisan test --filter=TaskDateSpanModelTest` → FAIL (unknown column).
- [ ] **Step 3: Migration** adds `$table->date('start_date')->nullable()->after('due_date');` down drops it.
- [ ] **Step 4: Model.** Add to `$fillable` and `$casts` (`'date'`). In `booted()` (create one if missing) a `saving` hook: start becomes null when due is null or start equals due. Add `isUpcoming()`. Progress: days elapsed counting the start day as 1, over span length in days inclusive, clamped 0–100, `floor`; null when no start or done.
- [ ] **Step 5: Run** the filter → PASS. Run `php artisan test --filter=Task` → all PASS (existing tasks unaffected).
- [ ] **Step 6: Commit** `feat(tasks): optional start date with span fields`.

### Task 2: Admin create and edit with a span

**Files:**
- Modify: `app/Http/Requests/TeamTaskRequest.php` (`due_type` gains `span`; `start_date` rule)
- Modify: `app/Http/Controllers/TeamTaskController.php` (`createTask` field list, both `update` field lists)
- Test: `tests/Feature/TeamTaskDateSpanTest.php` (copy the setup style of `TeamTaskDueTypeTest`)

**Interfaces:**
- Consumes: Task 1 column.
- Produces: `POST /admin/team-tasks` accepts `due_type=span` with `start_date` + `due_date`; `PATCH /admin/team-tasks/{task}` accepts `start_date` (nullable).

- [ ] **Step 1: Write the failing tests**
  - `test_span_creates_copies_with_start_and_due`: `due_type=span`, `start_date=2026-11-10`, `due_date=2026-11-20`, two people → both tasks have both dates.
  - `test_span_works_for_shared_and_whole_office`.
  - `test_span_needs_a_start_date`: `due_type=span` without `start_date` → error on `start_date`.
  - `test_start_after_due_is_rejected`: start `2026-11-21`, due `2026-11-20` → error on `start_date`, `Task::count() === 0`.
  - `test_start_is_prohibited_with_recurring_and_none`: each `due_type` with a `start_date` → error on `start_date`.
  - `test_edit_can_add_change_and_clear_start`: one-person task; PATCH with start → saved; PATCH `start_date=''` → null.
  - `test_edit_moving_due_before_start_is_rejected`.
  - `test_shared_edit_keeps_start_date` (Review Focus 2).
  - `test_repeat_copy_rejects_start_date`: task with `recurring_task_id` → PATCH with `start_date` → error.
- [ ] **Step 2: Run** `php artisan test --filter=TeamTaskDateSpanTest` → FAIL.
- [ ] **Step 3: Request.** `due_type` in `['date','span','recurring','none']`; `due_date` exclusion stays for `recurring`/`none` only. `start_date`: `Rule::prohibitedIf(in_array($dueType, ['recurring','none'], true) || ($task?->recurring_task_id !== null))`, `Rule::requiredIf($dueType === 'span')`, `nullable`, `date`, `before_or_equal:due_date`.
- [ ] **Step 4: Controller.** Add `start_date` to the `Arr::only` lists in `createTask()` and both branches of `update()`. Do not pass it into the `RecurringTask::create` fields (it is excluded with `due_type=recurring` anyway; keep `Arr::except($fields, ['due_date','start_date'])`).
- [ ] **Step 5: Run** the filter, then `php artisan test --filter=TeamTask` → PASS.
- [ ] **Step 6: Commit** `feat(team-tasks): admins set a date span on tasks`.

### Task 3: Employee create and edit with a span

**Files:**
- Modify: `app/Http/Controllers/TaskController.php` (`store`, `update` rules)
- Test: `tests/Feature/TaskDateSpanEmployeeTest.php`

- [ ] **Step 1: Write the failing tests**
  - `test_employee_creates_task_with_span`: `POST /employee/planner` (`PATCH /employee/planner/{task}` for edits) with start + due → saved.
  - `test_employee_start_after_due_is_rejected`.
  - `test_employee_can_change_and_clear_start_on_admin_assigned_task`.
  - `test_employee_edit_without_touching_start_keeps_it` (sends the same `start_date` back) (Review Focus 5).
  - `test_employee_cannot_set_start_on_repeat_copy`.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3:** Add `'start_date' => ['nullable', 'date', 'before_or_equal:due_date']` to `store`; to `update` the same plus `prohibited` when `$task->recurring_task_id !== null`.
- [ ] **Step 4: Run** filter + `php artisan test --filter=Task` → PASS.
- [ ] **Step 5: Commit** `feat(planner): employees set a date span on their tasks`.

### Task 4: Upcoming filter and count on Team tasks

**Files:**
- Modify: `app/Http/Controllers/TeamTaskController.php` (`index` filter + `filters.upcoming`, `statusCounts`)
- Test: add to `tests/Feature/TeamTaskStatusCountsTest.php`

**Interfaces:**
- Produces: query param `upcoming=1`; prop `filters.upcoming` (bool); `status_counts.upcoming` (int). `upcoming` and `overdue` are both accepted; when both are sent the server applies only `upcoming` (the UI never sends both).

- [ ] **Step 1: Tests:** `test_upcoming_filter_shows_only_not_started_tasks`; `test_upcoming_count_and_upcoming_still_count_as_todo` (one upcoming pending task → `todo === 1`, `upcoming === 1`).
- [ ] **Step 2: Run** → FAIL. **Step 3:** implement (`whereDate('start_date', '>', $today)->where('status', '!=', 'done')`). **Step 4:** `php artisan test --filter=TeamTask` → PASS.
- [ ] **Step 5: Commit** `feat(team-tasks): upcoming filter and count`.

### Task 5: Task form Date span (both portals)

**Files:**
- Modify: `resources/js/Components/TaskFormModal.jsx`

**Interfaces:**
- Consumes: Task 2 / 3 endpoints, `task.start_date` from Task 1.

- [ ] **Step 1:** `useForm` gains `start_date: task?.start_date ?? ''`.
- [ ] **Step 2: Admin create:** due-type radios become `[['date','Has a due date'],['span','Date span'],['recurring','Recurring'],['none','No due date']]`. `span` shows Start → Due date inputs side by side (ids `task-form-start-date-input`, `task-form-due-date-input`), a `"N days"` note computed inline (inclusive), `min={data.start_date}` on Due, errors under each. The `transform` sends `start_date: ''` unless `dueType === 'span'` (Review Focus 3); `span` keeps `due_date` and clears `repeat` like `date`.
- [ ] **Step 3: Employee create and every edit (no recurring copy):** a "Date span" checkbox above the Due field; when on (default on if `task?.start_date`), a Start input appears beside Due. Turning it off sets `start_date` to `''`. Hidden when `task?.repeat_label`.
- [ ] **Step 4: Verify** `npm run build` succeeds; in the app (`php artisan serve` or XAMPP) create a span task as admin and as employee and edit one; confirm both dates saved.
- [ ] **Step 5: Commit** `feat(tasks): date span in the task form` (include `public/build`).

### Task 6: Span on cards and detail

**Files:**
- Modify: `resources/js/Components/TaskBoard.jsx` (`dueText`, card meta row), `resources/js/Components/TaskDetailModal.jsx`

- [ ] **Step 1: `dueText(task)`:** unchanged for late / due today / due tomorrow / done. Otherwise, when `task.span_label`: `is_upcoming` → `` `Starts ${task.span_label}` ``, else `task.span_label`.
- [ ] **Step 2: Card:** `is_upcoming` → `<Badge variant="upcoming" size="sm">Upcoming</Badge>` next to the priority badge. When `span_progress !== null`: a 4px rounded bar under the meta row, track `bg-field`, fill in the portal accent (`#26215C` admin / `#0F6E56` employee via `accent`), `role="progressbar"` with `aria-valuenow`, `aria-label="Time used"`.
- [ ] **Step 3: Detail modal:** a `Start` `Detail` row before `Due` when `task.start_date`; Upcoming badge beside Overdue logic.
- [ ] **Step 4: Verify** `npm run build`; check Board and My Planner cards for: plain dated task (unchanged), running span, upcoming span, late span, done span (no bar).
- [ ] **Step 5: Commit** `feat(tasks): show date spans on task cards`.

### Task 7: Calendar shows spans across days

**Files:**
- Modify: `resources/js/Components/TeamTaskCalendar.jsx` (`byDate`)

- [ ] **Step 1:** In `byDate`, a task with `start_date` is pushed onto every date key from `start_date` to `due_date` inclusive; others unchanged. Build keys with the file's `toKey` over a local-date loop (parse `YYYY-MM-DD` as `new Date(y, m-1, d)`, never `new Date('YYYY-MM-DD')`, which is UTC).
- [ ] **Step 2:** Chips on days after the start get a small `→` prefix (or rounded-left removed); exact style is the builder's call.
- [ ] **Step 3: Verify** `npm run build`; a span Oct 28 → Nov 3 shows Nov 1–3 in November and Oct 28–31 in October (Review Focus 4).
- [ ] **Step 4: Commit** `feat(team-tasks): calendar spans across days`.

### Task 8: Team tasks tidy layout

**Files:**
- Modify: `resources/js/Pages/Admin/TeamTasks.jsx`
- Use `AdminPageHeader`'s existing `meta` prop for the counts (props: `title, badge, leading, action, meta`); modify the header only if `meta` cannot hold them
- Delete: `resources/js/Components/TeamStatusOverview.jsx`, `resources/js/Components/TeamPeopleStrip.jsx` once unused (grep first)

**Interfaces:**
- Consumes: props `offices` (`[{key,label,open,late}]`), `people` (`[{type,key,label,open,late}]`), `overview.open`, `status_counts` (`todo, doing, done, late, upcoming`), `filters` (+`upcoming`).

- [ ] **Step 1: Header:** title, counts as small pills (`N to do`, `N doing`, `N done`, `N late` in rose; hide late at 0), and the existing New Task button. Counts keep the "last 30 days / all time" meaning for Done via a `title`/sr-only note.
- [ ] **Step 2: Filter row** (one bordered row, wraps on phones):
  - Office `<select>`: `All offices · {overview.open}`, then `{label} · {open}`. Change → `applyFilters({ office, employee_id: '', whole: '' })`.
  - Person `<select>`: `Everyone`; when an office is chosen and a `whole` entry exists, `Whole office tasks · N open`; then each person `Name · N open · N late` (omit late at 0). The selected person stays listed even if they have no open tasks (same fallback as `TeamPeopleStrip`: name from `employees`). Change → `applyFilters({ employee_id, whole })`.
  - Priority `<select>` (unchanged options).
  - Chips (buttons with `aria-pressed`): `Late only (late)`, `Upcoming (upcoming)`, `Old completed`. Turning Late on sends `upcoming: false` and vice versa. `applyFilters` adds `if (merged.upcoming) query.upcoming = 1`.
  - Board / Calendar switch at the right (existing markup).
  - Drop the "Drag cards between columns" hint line.
- [ ] **Step 3:** Remove the old `TeamStatusOverview` and the `TeamPeopleStrip` panel; delete the components if nothing else imports them.
- [ ] **Step 4: Verify** `npm run build`; in the app at desktop and 375px wide: every filter still works (office, person, whole office, priority, late, upcoming, old completed), counts match the board, dark mode readable, keyboard can reach every control. `php artisan test --filter=TeamTask` still PASS.
- [ ] **Step 5: Commit** `feat(team-tasks): tidy board layout with dropdown filters`.

### Task 9: Wrap up

- [ ] **Step 1:** `CHANGELOG.md` `[Unreleased]` → Added: task date spans (admin and employee), Upcoming tag and filter, calendar spans. Changed: Team tasks layout (counts in header, dropdown filters).
- [ ] **Step 2:** `vendor/bin/pint --test` clean; `php artisan test` full suite PASS; `npm run build` clean.
- [ ] **Step 3: Commit** `docs(changelog): task date spans and Team tasks layout`.
- [ ] **Step 4:** Deploy is a separate, asked-for step (backup first; migration adds a nullable column).
