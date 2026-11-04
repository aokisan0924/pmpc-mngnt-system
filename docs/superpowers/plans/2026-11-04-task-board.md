# Task Board and Team Tasks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give employees a To do / Doing / Done board on My tasks, and give super admins a Team tasks board of every employee's tasks that they can add, edit, move and delete.

**Architecture:** Add a third `doing` value to the existing `tasks.status` column (existing `pending` rows display as "To do"). A shared React `TaskBoard` component renders the columns for both the employee Planner and a new admin `TeamTasks` page. Employee routes keep the ownership check; admin routes live under `role:super_admin` and skip it.

**Tech Stack:** Laravel 13 / PHP 8.3, Inertia 3 + React 19, Tailwind 4, PHPUnit (sqlite in-memory), Pint.

**Spec:** `docs/superpowers/specs/2026-11-04-task-board-design.md`

## Global Constraints

- New PHP files start with `declare(strict_types=1);` and use explicit argument and return types; validation goes in Form Requests, not inline.
- Eager-load `employee` on any task collection sent to Inertia (no N+1).
- Employee portal accent is `#0F6E56` (emerald); admin portal accent is `#26215C` (indigo).
- Timezone `Asia/Manila`; "overdue" = due date before today (Manila) and status not `done`. A task due today is not overdue.
- No new JS dependency: use the browser's native drag and drop, plus a "Move to…" `<select>` on each card for touch screens.
- Google Calendar, Gmail, notifications, manual card ordering are out of scope.
- Status values are exactly `pending` (shown "To do"), `doing` (shown "Doing"), `done` (shown "Done").
- Run `vendor/bin/pint` and `npm run build` before finishing. Do not deploy: deployment follows `DEPLOYMENTS.md` and is a separate step the user approves.

## Review Focus

- A `doing` task past its due date counts as overdue; a `done` task never does (dashboard and Planner both).
- Admin creates a task for an employee that does not exist or is not active: refused with a validation error, no row created.
- Team tasks filtered by an employee id that matches nobody returns an empty board, not an error.
- A non-admin employee cannot open or call any `/admin/team-tasks` route, and cannot change another employee's task through `/employee/planner/{task}/status`.
- The legacy toggle endpoint still works with three states: `doing` goes to `done`, `done` goes back to `pending`.

---

## File Structure

- Create `database/migrations/2026_11_04_000000_allow_doing_task_status.php`: widens `tasks.status`.
- Modify `app/Models/Task.php`: `STATUSES` constant, `toPlannerArray()`.
- Create `app/Http/Requests/TaskStatusRequest.php`: validates `status`.
- Modify `app/Http/Controllers/TaskController.php`: use `toPlannerArray()`, add `updateStatus()`, fix overdue rule.
- Create `app/Http/Requests/TeamTaskRequest.php`: validates admin create/update (includes `employee_id`).
- Create `app/Http/Controllers/TeamTaskController.php`: index with filters, store, update, updateStatus, destroy.
- Modify `routes/web.php`: one employee route, five admin routes.
- Create `resources/js/Components/TaskBoard.jsx`: the three-column board.
- Create `resources/js/Components/TaskFormModal.jsx`: extracted from `Employee/Planner.jsx`, optional employee select.
- Modify `resources/js/Pages/Employee/Planner.jsx`: Calendar/Board tabs, use `TaskFormModal`, fix "pending" filter.
- Create `resources/js/Pages/Admin/TeamTasks.jsx`.
- Modify `resources/js/Layouts/AdminLayout.jsx`: "Team tasks" nav item.
- Create `tests/Feature/TaskBoardTest.php`, `tests/Feature/TeamTasksTest.php`.
- Modify `CHANGELOG.md`.

---

### Task 1: The `doing` status and the employee status endpoint

**Files:**
- Create: `database/migrations/2026_11_04_000000_allow_doing_task_status.php`, `app/Http/Requests/TaskStatusRequest.php`
- Modify: `app/Models/Task.php`, `app/Http/Controllers/TaskController.php`, `routes/web.php` (shared employee group, after the `planner.toggle` line)
- Test: `tests/Feature/TaskBoardTest.php`

**Interfaces:**
- Produces: `Task::STATUSES` (`['pending','doing','done']`); `Task::toPlannerArray(): array` returning `id, title, description, due_date (Y-m-d), due_label (M d, Y), category, priority, status, is_overdue, employee_id, employee_name` (`employee_name` is `null` unless `employee` is loaded); route `PATCH /employee/planner/{task}/status` named `employee.planner.status`.

- [ ] **Step 1: Write failing tests in `TaskBoardTest`** (`RefreshDatabase`, factories for `Employee`, `Task::create` like `AuditFixRegressionTest`):
  - `test_employee_can_move_own_task_to_doing`: PATCH `/employee/planner/{task}/status` with `['status' => 'doing']` → row has status `doing`.
  - `test_employee_cannot_move_another_employees_task`: other employee's task → 403, status unchanged.
  - `test_invalid_status_is_rejected`: `['status' => 'archived']` → session error on `status`, status unchanged.
  - `test_doing_task_past_due_is_overdue_and_done_task_is_not`: `/employee/planner` Inertia props: past-due `doing` has `is_overdue` true, past-due `done` false, due-today `pending` false.
  - `test_toggle_moves_doing_to_done_and_done_to_pending`: PATCH `/employee/planner/{task}/toggle` twice.
- [ ] **Step 2: Run** `php artisan test --filter=TaskBoardTest` → expect FAIL (route missing, `doing` rejected by the enum check).
- [ ] **Step 3: Migration** `up()`: `Schema::table('tasks', fn ($t) => $t->string('status', 20)->default('pending')->change())` (replaces the enum on every driver; app-level validation enforces the values). `down()`: set `doing` rows to `pending`, then change back to `enum('status', ['pending','done'])->default('pending')`.
- [ ] **Step 4: Implement** `Task::STATUSES` and `toPlannerArray()`; make `TaskController::index` map with it; change its overdue rule to "due before today (Manila) and status !== 'done'". Add `TaskController::updateStatus(TaskStatusRequest $request, Task $task): RedirectResponse` using the existing `authorizeTask`, then `back()`. `TaskStatusRequest` rule: `status` required, `Rule::in(Task::STATUSES)`. Add the route.
- [ ] **Step 5: Run** `php artisan test --filter=TaskBoardTest` → PASS; then `php artisan test --filter=AuditFixRegressionTest` → still PASS (dashboard overdue untouched).
- [ ] **Step 6: Commit** `feat(tasks): add doing status and employee status endpoint`

### Task 2: Team tasks backend (admin)

**Files:**
- Create: `app/Http/Requests/TeamTaskRequest.php`, `app/Http/Controllers/TeamTaskController.php`
- Modify: `routes/web.php` (admin group)
- Test: `tests/Feature/TeamTasksTest.php`

**Interfaces:**
- Consumes: `Task::toPlannerArray()`, `Task::STATUSES`, `TaskStatusRequest`.
- Produces: Inertia page `Admin/TeamTasks` with props `tasks` (array of `toPlannerArray()`), `employees` (array of `{id, name}` for active employees), `filters` (`{employee_id, priority, overdue}`). Routes: `GET /admin/team-tasks` (`admin.team-tasks`), `POST /admin/team-tasks` (`.store`), `PATCH /admin/team-tasks/{task}` (`.update`), `PATCH /admin/team-tasks/{task}/status` (`.status`), `DELETE /admin/team-tasks/{task}` (`.destroy`).

- [ ] **Step 1: Write failing tests in `TeamTasksTest`:**
  - `test_super_admin_sees_every_employees_tasks_with_names`: two employees' tasks → page `Admin/TeamTasks`, both present, each with `employee_name`.
  - `test_filters_by_employee_priority_and_overdue`: query `?employee_id=`, `?priority=high`, `?overdue=1` each narrow the list; overdue excludes `done`.
  - `test_unknown_employee_filter_returns_empty_board`: `?employee_id=999999` → 200, `tasks` empty.
  - `test_regular_employee_and_guest_cannot_use_team_tasks`: employee: GET and POST are refused the same way other `/admin/*` pages refuse employees (read the role middleware and assert exactly that); guest redirects to login.
  - `test_admin_creates_task_for_an_active_employee`: POST with title, due_date, priority, `employee_id` → row owned by that employee.
  - `test_admin_cannot_create_task_for_inactive_or_missing_employee`: inactive employee id and `999999` → validation error on `employee_id`, no row.
  - `test_admin_can_update_move_and_delete_another_employees_task`: update (including reassigning `employee_id`), status to `doing`, delete.
- [ ] **Step 2: Run** `php artisan test --filter=TeamTasksTest` → expect FAIL (404s).
- [ ] **Step 3: Implement** `TeamTaskRequest` (rules: `title` required max 200, `description` nullable max 1000, `due_date` required date, `category` nullable max 100, `priority` in low/medium/high, `employee_id` required and exists in `employees` with `status = 'active'`). `TeamTaskController`: `index(Request): Response` (query `Task::with('employee')`, apply the three filters, order by `due_date` then priority like `TaskController`), `store(TeamTaskRequest)`, `update(TeamTaskRequest, Task)`, `updateStatus(TaskStatusRequest, Task)`, `destroy(Task)`; each mutation returns `back()` with a flash `success`. No ownership check. Add the five routes inside the existing `role:super_admin` admin group.
- [ ] **Step 4: Run** `php artisan test --filter=TeamTasksTest` → PASS.
- [ ] **Step 5: Commit** `feat(admin): team tasks controller, routes and filters`

### Task 3: Shared board component and the employee Board tab

**Files:**
- Create: `resources/js/Components/TaskBoard.jsx`, `resources/js/Components/TaskFormModal.jsx`
- Modify: `resources/js/Pages/Employee/Planner.jsx`

**Interfaces:**
- Produces: `<TaskBoard tasks onMove onEdit accent="emerald|indigo" showOwner />` where `onMove(task, status)` and `onEdit(task)` are callbacks; `<TaskFormModal open task employees onClose onSubmit />` where `employees` (optional array of `{id, name}`) adds an Employee select and includes `employee_id` in the submitted data; `task` null means create.

- [ ] **Step 1: Extract** the task create/edit modal from `Planner.jsx` into `TaskFormModal.jsx` with no behaviour change: keep `role="dialog"`, `aria-modal`, `aria-labelledby="task-form-title"`, Escape to close, label/`htmlFor` pairs, `useForm`, disabled submit while `processing`, errors beside inputs. `Planner.jsx` renders it in place of the inline modal.
- [ ] **Step 2: Build `TaskBoard.jsx`:** three columns (To do = `pending`, Doing, Done) each with a count; cards show title, due label, priority colour, overdue badge, category, and the employee name when `showOwner`. Cards are `draggable`; dropping on a column calls `onMove`. Each card has a "Move to…" `<select>` (labelled, keyboard reachable) that calls `onMove` too. Empty column shows a short empty-state line. Column header colour follows `accent`.
- [ ] **Step 3: Planner tabs:** add a Calendar / Board toggle (`role="tablist"`, keep the existing calendar as the default view). Board view renders `TaskBoard` with `onMove` → `router.patch('/employee/planner/{id}/status', { status }, { preserveScroll: true })` and `onEdit` opening the modal. Fix the existing status filter so "pending" shows every task whose status is not `done` (it currently compares equality and would hide `doing`), and update the header badge wording if needed.
- [ ] **Step 4: Verify:** `npm run build` succeeds. Then in the running app (log in as an employee with tasks): drag a card To do → Doing, reload and confirm it persisted; use the Move to select to reach Done; confirm the Calendar tab and edit/delete still work.
- [ ] **Step 5: Commit** `feat(planner): employee board view`

### Task 4: Team tasks page and sidebar

**Files:**
- Create: `resources/js/Pages/Admin/TeamTasks.jsx`
- Modify: `resources/js/Layouts/AdminLayout.jsx` (new item in the "People & attendance" section, near Employees)

**Interfaces:**
- Consumes: Task 2 props and routes; `TaskBoard`, `TaskFormModal` from Task 3.

- [ ] **Step 1: Build `TeamTasks.jsx`** inside `AdminLayout`, indigo accent: header, filter bar (Employee select with "All", Priority select with "Any", an "Overdue only" toggle) that updates the query string with `router.get(..., { preserveState: true, replace: true })`; "New task" button opening `TaskFormModal` with `employees`; `TaskBoard` with `showOwner`; moves call `PATCH /admin/team-tasks/{id}/status`; edit submits `PATCH /admin/team-tasks/{id}`; create posts `/admin/team-tasks`; delete uses the existing `ConfirmModal`.
- [ ] **Step 2: Add the sidebar item** "Team tasks" → `/admin/team-tasks`, with an icon in the same duotone SVG style as its neighbours.
- [ ] **Step 3: Verify:** `npm run build` succeeds. In the running app as `super_admin`: open Team tasks, filter by one employee, create a task for someone, drag it to Doing, edit it, delete it. Check a phone-width viewport (stacked columns, Move to select works) and that a plain employee login cannot reach the page.
- [ ] **Step 4: Commit** `feat(admin): team tasks board`

### Task 5: Final checks and changelog

**Files:**
- Modify: `CHANGELOG.md`

- [ ] **Step 1:** Add a CHANGELOG entry (match the file's existing heading style and tone) covering the Board tab, Doing status, and Team tasks.
- [ ] **Step 2: Run** `vendor/bin/pint --test` → clean (run `vendor/bin/pint` on the changed files if not); `php artisan test` → all pass; `npm run build` → succeeds.
- [ ] **Step 3: Report** what was verified in the browser, and that deployment (migration + build, per `DEPLOYMENTS.md`, database backup first) has not been done.
- [ ] **Step 4: Commit** `docs: changelog for task board`
